import { useState, useEffect, useCallback } from 'react';
import type { T212Position, T212Cash } from '@/types';
import { trading212 } from '@/services/trading212';
import * as storage from '@/services/storage';

interface UseTrading212Return {
  positions: T212Position[];
  cash: T212Cash | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
}

export function useTrading212(): UseTrading212Return {
  const [positions, setPositions] = useState<T212Position[]>([]);
  const [cash, setCash] = useState<T212Cash | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [fetchedPositions, fetchedCash] = await Promise.all([
        trading212.getPositions(),
        trading212.getAccountCash(),
      ]);

      setPositions(fetchedPositions);
      setCash(fetchedCash);
      setIsConnected(true);

      // Cache successful fetch
      storage.setPositions(fetchedPositions);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      setIsConnected(false);

      // Fall back to cached positions
      const cached = storage.getPositions();
      if (cached) {
        setPositions(cached.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { positions, cash, isLoading, error, isConnected, refresh };
}
