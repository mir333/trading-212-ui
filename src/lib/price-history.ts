import type { ISODate, PriceSeries, YahooChartResponse } from '@/types';

const PENCE_CURRENCIES = new Set(['GBp', 'GBX']);

const isoFromUnix = (seconds: number): ISODate => new Date(seconds * 1000).toISOString().slice(0, 10);

export function parseDailyHistory(res: YahooChartResponse): PriceSeries {
  const result = res.chart.result[0];
  const pence = PENCE_CURRENCIES.has(result.meta.currency);
  const scale = pence ? 0.01 : 1;
  const closeArr = result.indicators.quote[0]?.close ?? [];
  const adjArr = result.indicators.adjclose?.[0]?.adjclose;

  const closes: Record<ISODate, number> = {};
  const adjCloses: Record<ISODate, number> = {};
  result.timestamp.forEach((ts, i) => {
    const close = closeArr[i];
    if (close == null) return;
    const date = isoFromUnix(ts);
    closes[date] = close * scale;
    adjCloses[date] = (adjArr?.[i] ?? close) * scale;
  });

  const splits = Object.values(result.events?.splits ?? {})
    .map((s) => ({ date: isoFromUnix(s.date), ratio: s.numerator / s.denominator }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    symbol: result.meta.symbol,
    currency: pence ? 'GBP' : result.meta.currency,
    closes,
    adjCloses,
    splits,
  };
}

export function priceOn(series: Record<ISODate, number>, date: ISODate): number | null {
  const dates = Object.keys(series).sort();
  if (dates.length === 0) return null;
  let found = dates[0];
  for (const d of dates) {
    if (d > date) break;
    found = d;
  }
  return series[found];
}

export function fxSymbol(from: string, to: string): string {
  return `${from}${to}=X`;
}

export function toAccountCurrency(
  series: Record<ISODate, number>,
  fx: Record<ISODate, number> | null,
): Record<ISODate, number> {
  if (fx === null) return series;
  const out: Record<ISODate, number> = {};
  for (const [date, value] of Object.entries(series)) {
    const rate = priceOn(fx, date);
    if (rate !== null) out[date] = value * rate;
  }
  return out;
}
