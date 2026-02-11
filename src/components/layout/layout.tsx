import { createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import type { T212Position, T212Cash } from '@/types';
import { useTrading212 } from '@/hooks/use-trading212';
import { usePolling } from '@/hooks/use-polling';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppContextValue {
  positions: T212Position[];
  cash: T212Cash | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within <Layout />');
  }
  return ctx;
}

export function Layout() {
  const trading212Data = useTrading212();

  // Auto-refresh positions on a polling interval
  usePolling(trading212Data.refresh, 'pollingIntervalPositions');

  return (
    <AppContext.Provider value={trading212Data}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
