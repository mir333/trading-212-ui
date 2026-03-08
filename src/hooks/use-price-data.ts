import { useMemo, useCallback } from 'react';
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
  const { queue, refresh: queueRefresh, getResult } = useYahooQueue();

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