import type {
  ExternalFlow,
  HistoryEvents,
  ISODate,
  PriceSeries,
  ReconstructionResult,
} from '@/types';
import { eachDay } from './dates';
import { priceOn } from './price-history';

export interface ReconstructionInput {
  events: HistoryEvents;
  accountCurrency: string;
  prices: Record<string, PriceSeries>; // keyed by T212 ticker; missing = unpriceable
  fx: Record<string, Record<ISODate, number>>; // foreign currency -> rate to account currency
  today: ISODate;
}

const EPS = 1e-9;

export function reconstructAccount(input: ReconstructionInput): ReconstructionResult {
  const { events, accountCurrency, prices, fx, today } = input;

  const hasFx = (currency: string): boolean =>
    currency === accountCurrency || Object.keys(fx[currency] ?? {}).length > 0;

  const rateOn = (currency: string, date: ISODate): number => {
    if (currency === accountCurrency) return 1;
    const rate = fx[currency] ? priceOn(fx[currency], date) : null;
    if (rate === null) throw new Error(`Missing FX rates for ${currency}→${accountCurrency}`);
    return rate;
  };

  const dates = [...events.fills.map((f) => f.date), ...events.cashFlows.map((c) => c.date)];
  if (dates.length === 0) {
    return { points: [], externalFlows: [], unpricedTickers: [], holdingsToday: {}, valueToday: 0 };
  }
  const first = dates.reduce((a, b) => (b < a ? b : a));

  // Group events by day.
  const fillsByDay = new Map<ISODate, typeof events.fills>();
  for (const f of events.fills) {
    if (f.fillType === 'STOCK_SPLIT') continue;
    const list = fillsByDay.get(f.date) ?? [];
    list.push(f);
    fillsByDay.set(f.date, list);
  }
  const flowsByDay = new Map<ISODate, typeof events.cashFlows>();
  for (const c of events.cashFlows) {
    const list = flowsByDay.get(c.date) ?? [];
    list.push(c);
    flowsByDay.set(c.date, list);
  }

  const isPriceable = (ticker: string): boolean => {
    const s = prices[ticker];
    return !!s && Object.keys(s.closes).length > 0 && hasFx(s.currency);
  };

  // Put a fill's quantity on Yahoo's split-adjusted basis.
  const adjustedQty = (ticker: string, date: ISODate, quantity: number): number => {
    let q = quantity;
    for (const split of prices[ticker]?.splits ?? []) {
      if (split.date > date) q *= split.ratio;
    }
    return q;
  };

  let cash = 0;
  let netDeposited = 0;
  const qty: Record<string, number> = {};
  const lastUnitCost: Record<string, number> = {}; // account currency per share
  const points: ReconstructionResult['points'] = [];
  const externalFlows: ExternalFlow[] = [];

  for (const day of eachDay(first, today)) {
    for (const c of flowsByDay.get(day) ?? []) {
      const amount = c.amount * rateOn(c.currency, day);
      cash += amount;
      if (c.external) {
        netDeposited += amount;
        externalFlows.push({ date: day, amount });
      }
    }
    for (const f of fillsByDay.get(day) ?? []) {
      cash += f.cashImpact;
      qty[f.ticker] = (qty[f.ticker] ?? 0) + adjustedQty(f.ticker, day, f.quantity);
      if (Math.abs(f.quantity) > EPS) lastUnitCost[f.ticker] = Math.abs(f.cashImpact / f.quantity);
    }

    let holdings = 0;
    for (const [ticker, q] of Object.entries(qty)) {
      if (Math.abs(q) < EPS) continue;
      if (isPriceable(ticker)) {
        const s = prices[ticker];
        const close = priceOn(s.closes, day);
        if (close === null) continue;
        holdings += q * close * rateOn(s.currency, day);
      } else {
        holdings += q * (lastUnitCost[ticker] ?? 0);
      }
    }
    points.push({ date: day, value: cash + holdings, netDeposited });
  }

  const holdingsToday: Record<string, number> = {};
  const unpricedTickers: string[] = [];
  for (const [ticker, q] of Object.entries(qty)) {
    if (Math.abs(q) < EPS) continue;
    holdingsToday[ticker] = q;
    if (!isPriceable(ticker)) unpricedTickers.push(ticker);
  }

  return {
    points,
    externalFlows,
    unpricedTickers,
    holdingsToday,
    valueToday: points.at(-1)?.value ?? 0,
  };
}
