import type { ISODate, PriceSeries } from '@/types';
import { addDays } from '@/lib/dates';
import { mergePriceSeries, needsFullRefetch } from '@/lib/price-history';
import { idbGet, idbSet } from './history-db';
import { yahooFinance } from './yahoo-finance';

const FRESH_MS = 12 * 60 * 60 * 1000;
/** How long a "Yahoo has no data for this symbol" answer is trusted. */
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000;
const TAIL_OVERLAP_DAYS = 7;

interface CacheEntry {
  series: PriceSeries;
  fetchedAt: number;
  /** Requested start of the fetched range (first trading day may be later). */
  coveredFrom: ISODate;
}

/** Remembers that a symbol had no data / errored so it is not retried on every visit. */
interface NegativeEntry {
  series: null;
  fetchedAt: number;
}

const todayIso = (): ISODate => new Date().toISOString().slice(0, 10);

async function write(key: string, entry: CacheEntry | NegativeEntry): Promise<void> {
  try {
    await idbSet(key, entry);
  } catch {
    // cache write failure is non-fatal
  }
}

/**
 * Daily price series for a Yahoo symbol, cached in IndexedDB. Returns null
 * when Yahoo errors or has no data (caller treats the symbol as unpriceable);
 * that answer is cached for 24 h per symbol.
 */
export async function loadPriceSeries(symbol: string, from: ISODate): Promise<PriceSeries | null> {
  const key = `price:${symbol}`;
  let stored: CacheEntry | NegativeEntry | undefined;
  try {
    stored = await idbGet<CacheEntry | NegativeEntry>(key);
  } catch {
    stored = undefined;
  }
  if (stored && stored.series === null) {
    if (Date.now() - stored.fetchedAt < NEGATIVE_TTL_MS) return null;
    stored = undefined;
  }
  const cached = stored as CacheEntry | undefined;

  // A failed refresh keeps serving the cache and is not retried until the
  // normal freshness window has passed again.
  const serveCached = async (entry: CacheEntry): Promise<PriceSeries> => {
    await write(key, { ...entry, fetchedAt: Date.now() });
    return entry.series;
  };

  const covers = cached !== undefined && cached.coveredFrom <= from;
  if (cached && covers && Date.now() - cached.fetchedAt < FRESH_MS) return cached.series;

  const today = todayIso();
  let series: PriceSeries;
  let coveredFrom = from;
  try {
    if (cached && covers) {
      const dates = Object.keys(cached.series.closes).sort();
      const last = dates[dates.length - 1];
      const tailFrom = last ? addDays(last, -TAIL_OVERLAP_DAYS) : from;
      let tail: PriceSeries | null = null;
      try {
        tail = await yahooFinance.getDailyHistory(symbol, tailFrom, today);
      } catch {
        // Transient failure or no recent data: keep serving the cache.
        return serveCached(cached);
      }
      if (needsFullRefetch(cached.series, tail)) {
        // Split/dividend re-based history; a merge would be discontinuous.
        try {
          series = await yahooFinance.getDailyHistory(symbol, from, today);
        } catch {
          return serveCached(cached);
        }
      } else {
        series = mergePriceSeries(cached.series, tail);
        coveredFrom = cached.coveredFrom;
      }
    } else {
      series = await yahooFinance.getDailyHistory(symbol, from, today);
      if (Object.keys(series.closes).length === 0) {
        await write(key, { series: null, fetchedAt: Date.now() });
        return null;
      }
    }
  } catch {
    // Only reached with no usable cache. A non-covering cached series is kept
    // (not overwritten by a negative entry); otherwise remember the miss.
    if (!cached) await write(key, { series: null, fetchedAt: Date.now() });
    return null;
  }
  await write(key, { series, fetchedAt: Date.now(), coveredFrom });
  return series;
}
