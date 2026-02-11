import { useState, useEffect, useCallback } from 'react';
import type {
  OHLCData,
  Timeframe,
  TechnicalIndicators,
  StockSignal,
  SignalStrength,
} from '@/types';
import { yahooFinance } from '@/services/yahoo-finance';
import * as storage from '@/services/storage';
import { isCacheValid } from '@/services/storage';
import { computeIndicators, computeSignals, compositeScore } from '@/lib/signals';

const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

const TIMEFRAMES: Timeframe[] = ['daily', 'weekly', 'biweekly', 'monthly'];

interface UsePriceDataReturn {
  ohlcByTimeframe: Record<string, OHLCData[]>;
  indicatorsByTimeframe: Record<string, TechnicalIndicators>;
  signals: StockSignal[];
  compositeSignal: SignalStrength;
  compositeScoreValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePriceData(ticker: string | null): UsePriceDataReturn {
  const [ohlcByTimeframe, setOhlcByTimeframe] = useState<
    Record<string, OHLCData[]>
  >({});
  const [indicatorsByTimeframe, setIndicatorsByTimeframe] = useState<
    Record<string, TechnicalIndicators>
  >({});
  const [signals, setSignals] = useState<StockSignal[]>([]);
  const [compositeSignal, setCompositeSignal] =
    useState<SignalStrength>('hold');
  const [compositeScoreValue, setCompositeScoreValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ticker) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      let ohlcData: Record<string, OHLCData[]> | null = null;
      const cached = storage.getPriceData(ticker);

      if (cached && isCacheValid(cached.timestamp, CACHE_MAX_AGE_MS)) {
        ohlcData = cached.data;
      } else {
        // Fetch fresh data from Yahoo Finance
        ohlcData = await yahooFinance.getAllTimeframes(ticker);
        storage.setPriceData(ticker, ohlcData);
      }

      // Compute indicators and signals for each timeframe
      const newIndicators: Record<string, TechnicalIndicators> = {};
      const newSignals: StockSignal[] = [];

      for (const tf of TIMEFRAMES) {
        const data = ohlcData[tf];
        if (!data || data.length === 0) continue;

        const indicators = computeIndicators(data);
        newIndicators[tf] = indicators;

        const signal = computeSignals(ticker, tf, data, indicators);
        newSignals.push(signal);
      }

      // Compute composite signal
      const composite = compositeScore(newSignals);

      setOhlcByTimeframe(ohlcData);
      setIndicatorsByTimeframe(newIndicators);
      setSignals(newSignals);
      setCompositeSignal(composite.strength);
      setCompositeScoreValue(composite.score);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch price data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ohlcByTimeframe,
    indicatorsByTimeframe,
    signals,
    compositeSignal,
    compositeScoreValue,
    isLoading,
    error,
    refresh,
  };
}
