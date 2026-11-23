import { describe, expect, it } from 'vitest';
import type { CashFlow, Fill, ISODate, PriceSeries } from '@/types';
import { reconstructAccount } from './portfolio-reconstruction';

const dep = (date: ISODate, amount: number, currency = 'USD'): CashFlow => ({
  id: `dep-${date}`, date, kind: 'deposit', amount, currency, external: true,
});
const wd = (date: ISODate, amount: number, currency = 'USD'): CashFlow => ({
  id: `wd-${date}`, date, kind: 'withdrawal', amount: -amount, currency, external: true,
});
const buy = (date: ISODate, ticker: string, quantity: number, cost: number, currency = 'USD'): Fill => ({
  id: `buy-${date}-${ticker}`, date, ticker, quantity, cashImpact: -cost, currency, fillType: 'MARKET',
});
const splitFill = (date: ISODate, ticker: string, quantity: number): Fill => ({
  id: `split-${date}-${ticker}`, date, ticker, quantity, cashImpact: 0, currency: 'USD', fillType: 'STOCK_SPLIT',
});
const series = (
  currency: string,
  closes: Record<ISODate, number>,
  splits: PriceSeries['splits'] = [],
): PriceSeries => ({ symbol: 'X', currency, closes, adjCloses: closes, splits });

interface Opts {
  ccy: string;
  flows: CashFlow[];
  fills: Fill[];
  prices: Record<string, PriceSeries>;
  fx?: Record<string, Record<ISODate, number>>;
  today: ISODate;
}
const input = (o: Opts) => ({
  events: { fills: o.fills, cashFlows: o.flows },
  accountCurrency: o.ccy,
  prices: o.prices,
  fx: o.fx ?? {},
  today: o.today,
});

describe('reconstructAccount', () => {
  it('cash + holdings in account currency', () => {
    const r = reconstructAccount(input({ ccy: 'USD',
      flows: [dep('2024-01-01', 1000)], fills: [buy('2024-01-02', 'AAPL', 10, 500)],
      prices: { AAPL: series('USD', { '2024-01-02': 50, '2024-01-03': 60 }) }, today: '2024-01-03' }));
    expect(r.points.map((p) => p.value)).toEqual([1000, 1000, 1100]);
    expect(r.points.at(-1)!.netDeposited).toBe(1000);
  });
  it('no jump across a split', () => {
    const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 100)],
      fills: [buy('2024-01-01', 'X', 1, 100), splitFill('2024-01-03', 'X', 1)],
      prices: { X: series('USD', { '2024-01-01': 50, '2024-01-04': 50 }, [{ date: '2024-01-03', ratio: 2 }]) },
      today: '2024-01-04' }));
    expect(r.points.map((p) => p.value)).toEqual([100, 100, 100, 100]);
    expect(r.holdingsToday).toEqual({ X: 2 });
  });
  it('converts foreign holdings with fx', () => {
    const r = reconstructAccount(input({ ccy: 'EUR', flows: [dep('2024-01-01', 1000, 'EUR')],
      fills: [buy('2024-01-01', 'AAPL', 10, 900, 'EUR')],
      prices: { AAPL: series('USD', { '2024-01-01': 100 }) }, fx: { USD: { '2024-01-01': 0.9 } },
      today: '2024-01-01' }));
    expect(r.valueToday).toBeCloseTo(100 + 900);
  });
  it('unpriceable ticker valued at last fill cost and reported', () => {
    const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 500)],
      fills: [buy('2024-01-01', 'GONE', 5, 250)], prices: {}, today: '2024-01-02' }));
    expect(r.valueToday).toBe(500);
    expect(r.unpricedTickers).toEqual(['GONE']);
  });
  it('withdrawals reduce netDeposited and appear as negative external flows', () => {
    const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 1000), wd('2024-01-02', 300)],
      fills: [], prices: {}, today: '2024-01-02' }));
    expect(r.points.at(-1)).toMatchObject({ value: 700, netDeposited: 700 });
    expect(r.externalFlows).toEqual([{ date: '2024-01-01', amount: 1000 }, { date: '2024-01-02', amount: -300 }]);
  });
  it('sold-out positions are not held and not reported unpriced', () => {
    const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 100)],
      fills: [buy('2024-01-01', 'GONE', 1, 100), { ...buy('2024-01-02', 'GONE', -1, -120) }],
      prices: {}, today: '2024-01-02' }));
    expect(r.valueToday).toBe(120);
    expect(r.unpricedTickers).toEqual([]);
    expect(r.holdingsToday).toEqual({});
  });
  it('non-external flows change value but not netDeposited', () => {
    const div: CashFlow = { id: 'd', date: '2024-01-02', kind: 'dividend', amount: 5, currency: 'USD', external: false };
    const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 100), div],
      fills: [], prices: {}, today: '2024-01-02' }));
    expect(r.points.at(-1)).toMatchObject({ value: 105, netDeposited: 100 });
    expect(r.externalFlows).toEqual([{ date: '2024-01-01', amount: 100 }]);
  });
  it('holding with no FX series is valued at cost and reported unpriced', () => {
    const r = reconstructAccount(input({ ccy: 'EUR', flows: [dep('2024-01-01', 1000, 'EUR')],
      fills: [buy('2024-01-01', 'AAPL', 10, 900, 'EUR')],
      prices: { AAPL: series('USD', { '2024-01-01': 100, '2024-01-02': 200 }) }, fx: {},
      today: '2024-01-02' }));
    expect(r.valueToday).toBe(1000);
    expect(r.unpricedTickers).toEqual(['AAPL']);
  });
  it('converts a foreign-currency fill cash impact with fx', () => {
    const r = reconstructAccount(input({ ccy: 'EUR', flows: [dep('2024-01-01', 1000, 'EUR')],
      fills: [buy('2024-01-02', 'X', 10, 500, 'USD')],
      prices: { X: series('EUR', { '2024-01-01': 50 }) },
      fx: { USD: { '2024-01-01': 0.8, '2024-01-02': 0.9 } }, today: '2024-01-02' }));
    // cash 1000 - 500 USD * 0.9 = 550 EUR; holdings 10 * 50 EUR = 500
    expect(r.points.map((p) => p.value)).toEqual([1000, 1050]);
  });
  it('foreign-currency fill with no FX throws', () => {
    expect(() => reconstructAccount(input({ ccy: 'EUR', flows: [dep('2024-01-01', 1000, 'EUR')],
      fills: [buy('2024-01-01', 'X', 1, 100, 'USD')], prices: {}, today: '2024-01-01' }))).toThrow('Missing FX rates for USD→EUR');
  });
  it('foreign-currency cash flow with no FX throws', () => {
    expect(() => reconstructAccount(input({ ccy: 'EUR', flows: [dep('2024-01-01', 100, 'GBP')],
      fills: [], prices: {}, today: '2024-01-01' }))).toThrow('Missing FX rates for GBP→EUR');
  });
  it('stays fast for a large history (5y, 50 tickers, 2000 fills)', () => {
    const start = Date.parse('2019-01-01T00:00:00Z');
    const iso = (d: number) => new Date(start + d * 86_400_000).toISOString().slice(0, 10);
    const days = 5 * 365;
    const prices: Record<string, PriceSeries> = {};
    for (let t = 0; t < 50; t++) {
      const closes: Record<ISODate, number> = {};
      for (let d = 0; d < days; d++) if (d % 7 < 5) closes[iso(d)] = 100 + t + d * 0.01;
      prices[`T${t}`] = series('USD', closes);
    }
    const fills: Fill[] = [];
    for (let i = 0; i < 2000; i++) {
      const f = buy(iso(Math.floor((i * days) / 2000)), `T${i % 50}`, 1, 100);
      fills.push({ ...f, id: `f${i}` });
    }
    const t0 = performance.now();
    const r = reconstructAccount(input({ ccy: 'USD', flows: [dep(iso(0), 1_000_000)], fills, prices, today: iso(days - 1) }));
    const elapsed = performance.now() - t0;
    expect(r.points).toHaveLength(days);
    expect(elapsed).toBeLessThan(1000);
  });
});
