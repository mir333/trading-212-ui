import { useMemo, useCallback, useEffect } from 'react';
import type {
  OHLCData,
  TechnicalIndicators,
  StockSignal,
  SignalStrength,
} from '@/types';
import { useYahooQueue } from './use-yahoo-queue';

interface UsePriceDataReturn {
  ohlcByTimeframe: Record<string, OHLCData[]>;
  indicatorsByTimeframe: Record<string, TechnicalIndicators>;
  signals: StockSignal[];
  compositeSignal: SignalStrength;
  compositeScoreValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePriceData(ticker: string | null): UsePriceDataReturn {
  const { queue, enqueue, refresh: queueRefresh, getResult } = useYahooQueue();

  // Auto-load from cache (or fetch) when ticker changes
  useEffect(() => {
    if (ticker) enqueue(ticker);
  }, [ticker, enqueue]);

  const queueItem = useMemo(
    () => (ticker ? queue.find((i) => i.ticker === ticker) : undefined),
    [queue, ticker],
  );

  const result = useMemo(
    () => (ticker ? getResult(ticker) : null),
    [ticker, getResult],
  );

  const isLoading = queueItem?.status === 'pending' || queueItem?.status === 'loading';
  const error = queueItem?.status === 'error' ? (queueItem.error ?? 'Failed to fetch') : null;

  const refresh = useCallback(() => {
    if (!ticker) return;
    queueRefresh(ticker);
  }, [ticker, queueRefresh]);

  // Convenience: enqueue the ticker on first access if not cached
  // (caller can still call refresh() or enqueue explicitly)

  return {
    ohlcByTimeframe: result?.ohlcByTimeframe ?? {},
    indicatorsByTimeframe: result?.indicatorsByTimeframe ?? {},
    signals: result?.signals ?? [],
    compositeSignal: result?.compositeSignal ?? 'hold',
    compositeScoreValue: result?.compositeScoreValue ?? 0,
    isLoading,
    error,
    refresh,
  };
}