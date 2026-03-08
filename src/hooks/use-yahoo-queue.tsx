import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { OHLCData, StockSignal, TechnicalIndicators, Timeframe } from '@/types';
import { yahooFinance } from '@/services/yahoo-finance';
import * as storage from '@/services/storage';
import { isCacheValid } from '@/services/storage';
import { computeIndicators, computeSignals, compositeScore } from '@/lib/signals';

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const TIMEFRAMES: Timeframe[] = ['hourly', 'daily', 'weekly', 'biweekly', 'monthly'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueItem {
  ticker: string;
  status: 'pending' | 'loading' | 'done' | 'error';
  error?: string;
}

export interface TickerResult {
  ohlcByTimeframe: Record<string, OHLCData[]>;
  indicatorsByTimeframe: Record<string, TechnicalIndicators>;
  signals: StockSignal[];
  compositeSignal: import('@/types').SignalStrength;
  compositeScoreValue: number;
}

interface YahooQueueContextValue {
  /** Enqueue one or more tickers for loading. Skips tickers already queued. */
  enqueue: (tickers: string | string[]) => void;
  /** Force re-fetch a ticker (ignores cache). */
  refresh: (ticker: string) => void;
  /** Current queue state. */
  queue: QueueItem[];
  /** Whether any item is currently loading. */
  isProcessing: boolean;
  /** Number of completed items in current batch. */
  completed: number;
  /** Total items in current batch. */
  total: number;
  /** Get cached result for a ticker (available after load or from cache). */
  getResult: (ticker: string) => TickerResult | null;
}

const YahooQueueContext = createContext<YahooQueueContextValue | null>(null);

export function useYahooQueue(): YahooQueueContextValue {
  const ctx = useContext(YahooQueueContext);
  if (!ctx) throw new Error('useYahooQueue must be used within <YahooQueueProvider />');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function YahooQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [results, setResults] = useState<Record<string, TickerResult>>({});

  // Refs to coordinate the async queue processor
  const pendingRef = useRef<string[]>([]);
  const processingRef = useRef(false);
  const skipCacheSet = useRef<Set<string>>(new Set());

  // ── Process next item in the queue ────────────────────────────────────

  const processNext = useCallback(async () => {
    if (processingRef.current) return;
    if (pendingRef.current.length === 0) return;

    processingRef.current = true;

    while (pendingRef.current.length > 0) {
      const ticker = pendingRef.current.shift()!;
      const skipCache = skipCacheSet.current.has(ticker);
      if (skipCache) skipCacheSet.current.delete(ticker);

      // Mark as loading
      setQueue((q) =>
        q.map((item) =>
          item.ticker === ticker ? { ...item, status: 'loading' } : item,
        ),
      );

      try {
        let ohlcData: Record<string, OHLCData[]> | null = null;

        if (!skipCache) {
          const cached = storage.getPriceData(ticker);
          if (cached && isCacheValid(cached.timestamp, CACHE_MAX_AGE_MS)) {
            ohlcData = cached.data;
          }
        }

        if (!ohlcData) {
          ohlcData = await yahooFinance.getAllTimeframes(ticker);
          storage.setPriceData(ticker, ohlcData);
        }

        // Compute indicators and signals
        const newIndicators: Record<string, TechnicalIndicators> = {};
        const newSignals: StockSignal[] = [];

        for (const tf of TIMEFRAMES) {
          const data = ohlcData[tf];
          if (!data || data.length === 0) continue;
          const indicators = computeIndicators(data);
          newIndicators[tf] = indicators;
          newSignals.push(computeSignals(ticker, tf, data, indicators));
        }

        const composite = compositeScore(newSignals);

        const result: TickerResult = {
          ohlcByTimeframe: ohlcData,
          indicatorsByTimeframe: newIndicators,
          signals: newSignals,
          compositeSignal: composite.strength,
          compositeScoreValue: composite.score,
        };

        setResults((prev) => ({ ...prev, [ticker]: result }));

        // Persist all signals across tickers
        setResults((prev) => {
          const allSignals = Object.values(prev).flatMap((r) => r.signals);
          storage.setSignals(allSignals);
          return prev;
        });

        setQueue((q) =>
          q.map((item) =>
            item.ticker === ticker ? { ...item, status: 'done' } : item,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch';
        setQueue((q) =>
          q.map((item) =>
            item.ticker === ticker
              ? { ...item, status: 'error', error: message }
              : item,
          ),
        );
      }
    }

    processingRef.current = false;

    // Clear finished queue after a short delay so the UI can show completion
    setTimeout(() => {
      setQueue((q) => {
        const hasActive = q.some((i) => i.status === 'pending' || i.status === 'loading');
        return hasActive ? q : [];
      });
    }, 3000);
  }, []);

  // ── Enqueue ────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    (tickers: string | string[]) => {
      const list = Array.isArray(tickers) ? tickers : [tickers];
      const newItems: QueueItem[] = [];

      for (const ticker of list) {
        // Skip if already in the pending/active queue
        const alreadyQueued =
          pendingRef.current.includes(ticker) ||
          false; // will also check current queue state below

        if (alreadyQueued) continue;

        newItems.push({ ticker, status: 'pending' });
        pendingRef.current.push(ticker);
      }

      if (newItems.length === 0) return;

      setQueue((q) => {
        // Filter out tickers that are already active in the queue
        const activeTickers = new Set(
          q.filter((i) => i.status === 'pending' || i.status === 'loading').map((i) => i.ticker),
        );
        const filtered = newItems.filter((item) => !activeTickers.has(item.ticker));
        return [...q, ...filtered];
      });

      // Kick off processing
      void processNext();
    },
    [processNext],
  );

  // ── Refresh (force re-fetch) ──────────────────────────────────────────

  const refresh = useCallback(
    (ticker: string) => {
      skipCacheSet.current.add(ticker);
      // Remove from queue if it was completed/errored, so it can be re-added
      setQueue((q) => q.filter((i) => i.ticker !== ticker));
      pendingRef.current = pendingRef.current.filter((t) => t !== ticker);
      enqueue(ticker);
    },
    [enqueue],
  );

  // ── Get result ────────────────────────────────────────────────────────

  const getResult = useCallback(
    (ticker: string): TickerResult | null => {
      if (results[ticker]) return results[ticker];

      // Try loading from cache
      const cached = storage.getPriceData(ticker);
      if (cached && isCacheValid(cached.timestamp, CACHE_MAX_AGE_MS)) {
        const ohlcData = cached.data;
        const newIndicators: Record<string, TechnicalIndicators> = {};
        const newSignals: StockSignal[] = [];

        for (const tf of TIMEFRAMES) {
          const data = ohlcData[tf];
          if (!data || data.length === 0) continue;
          const indicators = computeIndicators(data);
          newIndicators[tf] = indicators;
          newSignals.push(computeSignals(ticker, tf, data, indicators));
        }

        const composite = compositeScore(newSignals);
        return {
          ohlcByTimeframe: ohlcData,
          indicatorsByTimeframe: newIndicators,
          signals: newSignals,
          compositeSignal: composite.strength,
          compositeScoreValue: composite.score,
        };
      }

      return null;
    },
    [results],
  );

  // ── Derived state ─────────────────────────────────────────────────────

  const isProcessing = queue.some(
    (i) => i.status === 'pending' || i.status === 'loading',
  );
  const completed = queue.filter((i) => i.status === 'done').length;
  const total = queue.length;

  return (
    <YahooQueueContext.Provider
      value={{ enqueue, refresh, queue, isProcessing, completed, total, getResult }}
    >
      {children}
    </YahooQueueContext.Provider>
  );
}