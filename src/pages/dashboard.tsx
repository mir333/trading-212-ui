import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Settings, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/layout/layout';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { SignalOverview } from '@/components/dashboard/signal-overview';
import { TopMovers } from '@/components/dashboard/top-movers';
import { getSignals } from '@/services/storage';
import type { SignalStrength, StockSignal } from '@/types';

function computeSignalCounts(signals: StockSignal[]): Record<SignalStrength, number> {
  const counts: Record<SignalStrength, number> = {
    'strong-buy': 0,
    'buy': 0,
    'hold': 0,
    'sell': 0,
    'strong-sell': 0,
  };
  for (const s of signals) {
    counts[s.strength]++;
  }
  return counts;
}

export default function Dashboard() {
  const { positions, cash, accountCurrency, isLoading, error, isConnected, refreshPositions, refreshCash } =
    useAppContext();

  // Fetch cash once when the dashboard mounts
  const cashLoaded = useRef(false);
  useEffect(() => {
    if (cashLoaded.current || !isConnected) return;
    cashLoaded.current = true;
    void refreshCash();
  }, [isConnected, refreshCash]);

  const signalCounts = useMemo(() => {
    const cached = getSignals();
    if (cached?.data) {
      return computeSignalCounts(cached.data);
    }
    return {
      'strong-buy': 0,
      'buy': 0,
      'hold': 0,
      'sell': 0,
      'strong-sell': 0,
    } satisfies Record<SignalStrength, number>;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- positions change triggers signal recount
  }, [positions]);

  const handleRefresh = async () => {
    await refreshPositions();
    await refreshCash();
  };

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Settings className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Connect Your Account</h2>
        <p className="text-muted-foreground">
          Add your Trading 212 API key to get started.
        </p>
        <Button asChild>
          <Link to="/settings">Go to Settings</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void handleRefresh()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AccountSummary cash={cash} positions={positions} isLoading={isLoading} accountCurrency={accountCurrency} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SignalOverview signals={signalCounts} />
        </div>
        <div className="lg:col-span-2">
          <TopMovers positions={positions} accountCurrency={accountCurrency} />
        </div>
      </div>
    </div>
  );
}
