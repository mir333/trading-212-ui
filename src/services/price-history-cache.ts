import type { ISODate, PriceSeries } from '@/types';
import { addDays } from '@/lib/dates';
import { mergePriceSeries } from '@/lib/price-history';
import { idbGet, idbSet } from './history-db';
import { yahooFinance } from './yahoo-finance';

const FRESH_MS = 12 * 60 * 60 * 1000;
const TAIL_OVERLAP_DAYS = 7;

interface CacheEntry {
  series: PriceSeries;
  fetchedAt: number;
  /** Requested start of the fetched range (first trading day may be later). */
  coveredFrom: ISODate;
}

const todayIso = (): ISODate => new Date().toISOString().slice(0, 10);

/**
 * Daily price series for a Yahoo symbol, cached in IndexedDB. Returns null
 * when Yahoo errors or has no data (caller treats the symbol as unpriceable).
 */
export async function loadPriceSeries(symbol: string, from: ISODate): Promise<PriceSeries | null> {
  const key = `price:${symbol}`;
  let cached: CacheEntry | undefined;
  try {
    cached = await idbGet<CacheEntry>(key);
  } catch {
    cached = undefined;
  }

  const covers = cached !== undefined && cached.coveredFrom <= from;
  if (cached && covers && Date.now() - cached.fetchedAt < FRESH_MS) return cached.series;

  try {
    const today = todayIso();
    let series: PriceSeries;
    let coveredFrom = from;
    if (cached && covers) {
      const dates = Object.keys(cached.series.closes).sort();
      const last = dates[dates.length - 1];
      const tailFrom = last ? addDays(last, -TAIL_OVERLAP_DAYS) : from;
      const fresh = await yahooFinance.getDailyHistory(symbol, tailFrom, today);
      series = mergePriceSeries(cached.series, fresh);
      coveredFrom = cached.coveredFrom;
    } else {
      series = await yahooFinance.getDailyHistory(symbol, from, today);
    }
    try {
      await idbSet(key, { series, fetchedAt: Date.now(), coveredFrom } satisfies CacheEntry);
    } catch {
      // cache write failure is non-fatal
    }
    return series;
  } catch {
    return null;
  }
}
