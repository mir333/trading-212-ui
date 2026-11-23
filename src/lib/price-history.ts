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

// Sorted-key cache so repeated lookups are O(log n). Series are treated as
// immutable once priced; mutating one after a lookup would leave this stale.
const sortedKeyCache = new WeakMap<object, ISODate[]>();

export function priceOn(series: Record<ISODate, number>, date: ISODate): number | null {
  let dates = sortedKeyCache.get(series);
  if (!dates) {
    dates = Object.keys(series).sort();
    sortedKeyCache.set(series, dates);
  }
  if (dates.length === 0) return null;
  // last index with dates[i] <= date; 0 if date precedes all
  let lo = 0;
  let hi = dates.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (dates[mid] <= date) lo = mid;
    else hi = mid - 1;
  }
  return series[dates[lo]];
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

/**
 * Merge a freshly fetched tail into a cached series. Fresh values win on
 * overlapping dates. Always builds new `closes`/`adjCloses` objects so the
 * `priceOn` sorted-key cache for the cached series is never invalidated.
 */
export function mergePriceSeries(cached: PriceSeries, fresh: PriceSeries): PriceSeries {
  const splits = new Map<ISODate, number>();
  for (const s of cached.splits) splits.set(s.date, s.ratio);
  for (const s of fresh.splits) splits.set(s.date, s.ratio);
  return {
    symbol: fresh.symbol,
    currency: fresh.currency,
    closes: { ...cached.closes, ...fresh.closes },
    adjCloses: { ...cached.adjCloses, ...fresh.adjCloses },
    splits: [...splits].map(([date, ratio]) => ({ date, ratio })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}
