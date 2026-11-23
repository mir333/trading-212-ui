import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PriceSeries } from '@/types';

const store = new Map<string, unknown>();
vi.mock('./history-db', () => ({
  idbGet: vi.fn(async (key: string) => store.get(key)),
  idbSet: vi.fn(async (key: string, value: unknown) => {
    store.set(key, structuredClone(value));
  }),
}));
const getDailyHistory = vi.fn<(symbol: string, from: string, to: string) => Promise<PriceSeries>>();
vi.mock('./yahoo-finance', () => ({ yahooFinance: { getDailyHistory: (...a: [string, string, string]) => getDailyHistory(...a) } }));

const { loadPriceSeries } = await import('./price-history-cache');

const HOUR = 60 * 60 * 1000;
const series = (closes: Record<string, number>): PriceSeries => ({
  symbol: 'X', currency: 'USD', closes, adjCloses: closes, splits: [],
});

describe('loadPriceSeries caching', () => {
  beforeEach(() => {
    store.clear();
    getDailyHistory.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-03T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches a failed lookup for 24 h instead of re-hitting Yahoo', async () => {
    getDailyHistory.mockRejectedValue(new Error('404'));
    expect(await loadPriceSeries('NOPE', '2024-01-01')).toBeNull();
    expect(await loadPriceSeries('NOPE', '2024-01-01')).toBeNull();
    expect(getDailyHistory).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 25 * HOUR);
    expect(await loadPriceSeries('NOPE', '2024-01-01')).toBeNull();
    expect(getDailyHistory).toHaveBeenCalledTimes(2);
  });

  it('caches an empty series as no data', async () => {
    getDailyHistory.mockResolvedValue(series({}));
    expect(await loadPriceSeries('EMPTY', '2024-01-01')).toBeNull();
    expect(await loadPriceSeries('EMPTY', '2024-01-01')).toBeNull();
    expect(getDailyHistory).toHaveBeenCalledTimes(1);
  });

  it('negative entries are per symbol', async () => {
    getDailyHistory.mockRejectedValueOnce(new Error('404'));
    expect(await loadPriceSeries('BAD', '2024-01-01')).toBeNull();
    getDailyHistory.mockResolvedValueOnce(series({ '2024-06-03': 5 }));
    expect(await loadPriceSeries('GOOD', '2024-01-01')).not.toBeNull();
    expect(getDailyHistory).toHaveBeenCalledTimes(2);
  });

  it('a failed tail refresh serves the cache and waits a full freshness window before retrying', async () => {
    getDailyHistory.mockResolvedValueOnce(series({ '2024-06-03': 10 }));
    await loadPriceSeries('X', '2024-01-01');

    vi.setSystemTime(Date.now() + 13 * HOUR);
    getDailyHistory.mockRejectedValueOnce(new Error('503'));
    expect((await loadPriceSeries('X', '2024-01-01'))?.closes).toEqual({ '2024-06-03': 10 });
    expect(getDailyHistory).toHaveBeenCalledTimes(2);

    vi.setSystemTime(Date.now() + 11 * HOUR);
    expect((await loadPriceSeries('X', '2024-01-01'))?.closes).toEqual({ '2024-06-03': 10 });
    expect(getDailyHistory).toHaveBeenCalledTimes(2);
  });
});
