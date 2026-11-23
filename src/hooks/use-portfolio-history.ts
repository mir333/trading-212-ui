import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoryEvents, ISODate, PriceSeries, ReconstructionResult } from '@/types';
import { historyNamespace, syncHistory } from '@/services/history-sync';
import { getCredentials } from '@/services/storage';
import { loadPriceSeries } from '@/services/price-history-cache';
import { resolveYahooTicker } from '@/services/yahoo-finance';
import { dropCurrencyMismatches, fxSymbol, toAccountCurrency } from '@/lib/price-history';
import { reconstructAccount } from '@/lib/portfolio-reconstruction';

export type PortfolioHistoryStatus = 'idle' | 'syncing' | 'ready' | 'error';

/** Synced events plus everything needed to price them; rebuilt into a reconstruction in render. */
interface AccountHistory {
  events: HistoryEvents;
  prices: Record<string, PriceSeries>; // keyed by T212 ticker
  fx: Record<string, Record<ISODate, number>>;
  today: ISODate;
  /** First event date; null when the account has no history. */
  firstDate: ISODate | null;
}

interface Settled<T> {
  key: string;
  value?: T;
  error?: string;
}

// ---------------------------------------------------------------------------
// Single-flight runner shared by every hook instance (StrictMode double-mounts,
// refresh clicks mid-run). Runs are serialized in one lane so only one
// sync/price-load is ever in flight, and a run with the same key is joined
// instead of started again.
// ---------------------------------------------------------------------------

const inflight = new Map<string, Promise<unknown>>();
let lane: Promise<unknown> = Promise.resolve();

function runOnce<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const run = lane.then(task).finally(() => inflight.delete(key));
  lane = run.catch(() => undefined);
  inflight.set(key, run);
  return run;
}

const progressListeners = new Set<(message: string) => void>();
const emitProgress = (message: string): void => {
  for (const listener of progressListeners) listener(message);
};

const todayIso = (): ISODate => new Date().toISOString().slice(0, 10);
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

async function loadAccountHistory(namespace: string, accountCurrency: string): Promise<AccountHistory> {
  const events = await syncHistory(namespace, emitProgress);
  const today = todayIso();

  const dates = [...events.fills.map((f) => f.date), ...events.cashFlows.map((c) => c.date)];
  if (dates.length === 0) return { events, prices: {}, fx: {}, today, firstDate: null };
  const firstDate = dates.reduce((a, b) => (b < a ? b : a));

  const tickers = [...new Set(events.fills.map((f) => f.ticker))];
  const prices: Record<string, PriceSeries> = {};
  for (let i = 0; i < tickers.length; i++) {
    emitProgress(`Loading prices ${i + 1}/${tickers.length}`);
    const series = await loadPriceSeries(resolveYahooTicker(tickers[i]), firstDate);
    if (series) prices[tickers[i]] = series;
  }

  const currencies = [
    ...new Set([
      ...Object.values(prices).map((s) => s.currency),
      ...events.cashFlows.map((c) => c.currency),
      ...events.fills.map((f) => f.currency),
    ]),
  ].filter((c) => c !== accountCurrency);
  const fx: Record<string, Record<ISODate, number>> = {};
  for (let i = 0; i < currencies.length; i++) {
    emitProgress(`Loading exchange rates ${i + 1}/${currencies.length}`);
    const series = await loadPriceSeries(fxSymbol(currencies[i], accountCurrency), firstDate);
    if (series && Object.keys(series.closes).length > 0) fx[currencies[i]] = series.closes;
  }

  return { events, prices, fx, today, firstDate };
}

async function loadBenchmarkPrices(
  benchmarkId: string,
  accountCurrency: string,
  from: ISODate,
): Promise<Record<ISODate, number>> {
  emitProgress(`Loading ${benchmarkId} prices…`);
  const series = await loadPriceSeries(benchmarkId, from);
  if (!series || Object.keys(series.adjCloses).length === 0) {
    throw new Error(`No price history available for benchmark ${benchmarkId}`);
  }
  if (series.currency === accountCurrency) return series.adjCloses;

  const fx = await loadPriceSeries(fxSymbol(series.currency, accountCurrency), from);
  if (!fx || Object.keys(fx.closes).length === 0) {
    throw new Error(`Missing FX rates for ${series.currency}→${accountCurrency} (benchmark ${benchmarkId})`);
  }
  return toAccountCurrency(series.adjCloses, fx.closes);
}

/**
 * Syncs T212 history, prices it and rebuilds the account once per load; loads
 * the benchmark's adjclose series in the account currency. `accountCurrency`
 * or `accountId` null = not known yet (nothing is loaded). History is stored
 * per environment (demo/live) and account id. Runs on mount, on `refresh()`
 * and when the account changes; changing `benchmarkId` reloads only the
 * benchmark.
 */
export function usePortfolioHistory(
  accountCurrency: string | null,
  accountId: number | null,
  benchmarkId: string,
  /** T212 instrument currency per ticker; series in another currency are treated as unpriced. */
  tickerCurrencies: Record<string, string>,
): {
  status: PortfolioHistoryStatus;
  progress: string;
  error: string | null;
  reconstruction: ReconstructionResult | null;
  benchmarkPrices: Record<ISODate, number> | null;
  refresh: () => void;
} {
  const [reloadToken, setReloadToken] = useState(0);
  const [progress, setProgress] = useState('');
  const [account, setAccount] = useState<Settled<AccountHistory> | null>(null);
  const [benchmark, setBenchmark] = useState<Settled<Record<ISODate, number>> | null>(null);

  useEffect(() => {
    progressListeners.add(setProgress);
    return () => {
      progressListeners.delete(setProgress);
    };
  }, []);

  // Read at render so the namespace matches the credentials the sync will use.
  const namespace = accountId !== null ? historyNamespace(getCredentials()?.isDemo ?? false, accountId) : null;
  // Results are tagged with the request key they belong to; a result whose
  // key no longer matches the current request is stale and ignored.
  const accountKey = accountCurrency && namespace ? `${namespace}|${accountCurrency}#${reloadToken}` : null;

  useEffect(() => {
    if (!accountCurrency || !namespace || !accountKey) return;
    let cancelled = false;
    runOnce(`account:${namespace}|${accountCurrency}`, () => loadAccountHistory(namespace, accountCurrency)).then(
      (value) => {
        if (!cancelled) setAccount({ key: accountKey, value });
      },
      (err: unknown) => {
        if (!cancelled) setAccount({ key: accountKey, error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountCurrency, namespace, accountKey]);

  const accountCurrent = account && account.key === accountKey ? account : null;
  const accountData = accountCurrent?.value;

  // Rebuilt here rather than in the run so a late instrument list (currency
  // check) re-prices without re-syncing.
  const built = useMemo((): { reconstruction: ReconstructionResult } | { error: string } | null => {
    if (!accountData || !accountCurrency) return null;
    const { events, fx, today } = accountData;
    try {
      const prices = dropCurrencyMismatches(accountData.prices, tickerCurrencies);
      return { reconstruction: reconstructAccount({ events, accountCurrency, prices, fx, today }) };
    } catch (err) {
      return { error: errorMessage(err) };
    }
  }, [accountData, accountCurrency, tickerCurrencies]);
  const firstDate = accountCurrent?.value?.firstDate ?? null;
  const benchmarkKey =
    accountCurrency && accountCurrent?.value && firstDate
      ? `${benchmarkId}|${accountCurrency}|${firstDate}|${accountCurrent.key}`
      : null;

  useEffect(() => {
    if (!accountCurrency || !firstDate || !benchmarkKey) return;
    let cancelled = false;
    runOnce(`benchmark:${benchmarkKey}`, () => loadBenchmarkPrices(benchmarkId, accountCurrency, firstDate)).then(
      (value) => {
        if (!cancelled) setBenchmark({ key: benchmarkKey, value });
      },
      (err: unknown) => {
        if (!cancelled) setBenchmark({ key: benchmarkKey, error: errorMessage(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [accountCurrency, benchmarkId, firstDate, benchmarkKey]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  const benchmarkCurrent = benchmark && benchmark.key === benchmarkKey ? benchmark : null;

  let status: PortfolioHistoryStatus;
  let error: string | null = null;
  if (!accountKey) status = 'idle';
  else if (!accountCurrent) status = 'syncing';
  else if (accountCurrent.error !== undefined) {
    status = 'error';
    error = accountCurrent.error;
  } else if (built && 'error' in built) {
    status = 'error';
    error = built.error;
  } else if (!benchmarkKey) status = 'ready'; // no history → nothing to benchmark
  else if (!benchmarkCurrent) status = 'syncing';
  else if (benchmarkCurrent.error !== undefined) {
    status = 'error';
    error = benchmarkCurrent.error;
  } else status = 'ready';

  return {
    status,
    progress,
    error,
    reconstruction: built && 'reconstruction' in built ? built.reconstruction : null,
    benchmarkPrices: benchmarkCurrent?.value ?? null,
    refresh,
  };
}
