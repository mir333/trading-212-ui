import { useState, useEffect, useCallback, useRef } from 'react';
import type { T212Position, T212Cash, T212Instrument } from '@/types';
import { trading212 } from '@/services/trading212';
import * as storage from '@/services/storage';

interface UseTrading212Return {
  positions: T212Position[];
  cash: T212Cash | null;
  instruments: T212Instrument[];
  tickerNames: Record<string, string>;
  /** Currency code per ticker, derived from instruments (e.g. USD, GBX, EUR). */
  tickerCurrencies: Record<string, string>;
  /** Account base currency (e.g. GBP, EUR, USD). */
  accountCurrency: string;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  /** Refresh positions only (used by header / portfolio). */
  refreshPositions: () => Promise<void>;
  /** Refresh cash only (used by dashboard). */
  refreshCash: () => Promise<void>;
}

const INSTRUMENTS_CACHE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export function useTrading212(): UseTrading212Return {
  const [positions, setPositions] = useState<T212Position[]>([]);
  const [cash, setCash] = useState<T212Cash | null>(null);
  const [instruments, setInstruments] = useState<T212Instrument[]>([]);
  const [tickerNames, setTickerNames] = useState<Record<string, string>>({});
  const [tickerCurrencies, setTickerCurrencies] = useState<Record<string, string>>({});
  const [accountCurrency, setAccountCurrency] = useState('USD');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const instrumentsLoaded = useRef(false);
  const accountLoaded = useRef(false);

  const applyInstruments = useCallback((list: T212Instrument[]) => {
    setInstruments(list);
    const nameMap: Record<string, string> = {};
    const currMap: Record<string, string> = {};
    for (const inst of list) {
      nameMap[inst.ticker] = inst.name;
      currMap[inst.ticker] = inst.currencyCode;
    }
    setTickerNames(nameMap);
    setTickerCurrencies(currMap);
  }, []);

  // Load instruments exactly once on app start
  const loadInstruments = useCallback(async () => {
    if (instrumentsLoaded.current) return;
    instrumentsLoaded.current = true;

    const cached = storage.getInstruments();
    if (cached && storage.isCacheValid(cached.timestamp, INSTRUMENTS_CACHE_MAX_AGE_MS)) {
      applyInstruments(cached.data);
      return;
    }

    try {
      const fetched = await trading212.getInstruments();
      applyInstruments(fetched);
      storage.setInstruments(fetched);
    } catch {
      if (cached) {
        applyInstruments(cached.data);
      }
    }
  }, [applyInstruments]);

  // Refresh positions only — no cash call
  const refreshPositions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedPositions = await trading212.getPositions();
      setPositions(fetchedPositions);
      setIsConnected(true);
      storage.setPositions(fetchedPositions);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch positions';
      setError(message);
      setIsConnected(false);

      const cached = storage.getPositions();
      if (cached) {
        setPositions(cached.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh cash only — called from dashboard
  const refreshCash = useCallback(async () => {
    try {
      const fetchedCash = await trading212.getAccountCash();
      setCash(fetchedCash);
    } catch {
      // Cash is non-critical; silently ignore errors
    }
  }, []);

  // Load account info (currency) exactly once
  const loadAccount = useCallback(async () => {
    if (accountLoaded.current) return;
    accountLoaded.current = true;

    try {
      const account = await trading212.getAccount();
      setAccountCurrency(account.currencyCode);
    } catch {
      // Non-critical — keep default
    }
  }, []);

  // On mount: load positions + instruments + account (once)
  useEffect(() => {
    void refreshPositions();
    void loadInstruments();
    void loadAccount();
  }, [refreshPositions, loadInstruments, loadAccount]);

  return {
    positions,
    cash,
    instruments,
    tickerNames,
    tickerCurrencies,
    accountCurrency,
    isLoading,
    error,
    isConnected,
    refreshPositions,
    refreshCash,
  };
}
