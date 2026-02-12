import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, ArrowUpDown, AlertCircle, Settings, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SignalBadge } from '@/components/common/signal-badge';
import { useAppContext } from '@/components/layout/layout';
import { yahooFinance } from '@/services/yahoo-finance';
import * as storage from '@/services/storage';
import { isCacheValid } from '@/services/storage';
import { computeIndicators, computeSignals, compositeScore } from '@/lib/signals';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { T212Position, SignalStrength, Timeframe } from '@/types';

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const TIMEFRAMES: Timeframe[] = ['hourly', 'daily', 'weekly', 'biweekly', 'monthly'];

interface PositionWithSignal extends T212Position {
  signal: SignalStrength | null;
  signalScore: number;
  pnlPct: number;
  totalValue: number;
}

type SortKey = 'ticker' | 'totalValue' | 'ppl' | 'pnlPct' | 'signal' | 'quantity' | 'averagePrice';
type SortDir = 'asc' | 'desc';

const signalOrder: Record<SignalStrength, number> = {
  'strong-buy': 5,
  'buy': 4,
  'hold': 3,
  'sell': 2,
  'strong-sell': 1,
};

function getSignalSortValue(signal: SignalStrength | null): number {
  return signal ? signalOrder[signal] : 0;
}

/** Build enriched rows from positions, optionally restoring cached signals. */
function buildEnrichedPositions(positions: T212Position[]): PositionWithSignal[] {
  // Try to restore previously computed signals from localStorage
  const cachedSignals = storage.getSignals();
  const signalMap = new Map<string, { strength: SignalStrength; score: number }>();

  if (cachedSignals?.data) {
    // Group signals by ticker and compute composite
    const byTicker = new Map<string, import('@/types').StockSignal[]>();
    for (const s of cachedSignals.data) {
      const arr = byTicker.get(s.ticker) ?? [];
      arr.push(s);
      byTicker.set(s.ticker, arr);
    }
    for (const [ticker, signals] of byTicker) {
      const composite = compositeScore(signals);
      signalMap.set(ticker, { strength: composite.strength, score: composite.score });
    }
  }

  return positions.map((pos) => {
    const cost = pos.averagePrice * pos.quantity;
    const totalValue = pos.currentPrice * pos.quantity;
    const pnlPct = cost > 0 ? ((totalValue - cost) / cost) * 100 : 0;
    const cached = signalMap.get(pos.ticker);
    return {
      ...pos,
      signal: cached?.strength ?? null,
      signalScore: cached?.score ?? 0,
      pnlPct,
      totalValue,
    };
  });
}

export default function Portfolio() {
  const { positions, tickerNames, isLoading: positionsLoading, error: positionsError, isConnected } = useAppContext();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [signalFilter, setSignalFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [enrichedPositions, setEnrichedPositions] = useState<PositionWithSignal[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ done: 0, total: 0 });

  // Track whether we have already initialised from positions to avoid resetting
  // enriched data every time the positions reference changes.
  const initialisedForTickers = useRef<string>('');

  const computeSignalsForPositions = useCallback(async () => {
    if (positions.length === 0) return;

    setIsComputing(true);

    // Separate positions into fresh-cache (skip Yahoo) vs stale (need fetch)
    const stale: T212Position[] = [];
    const fresh: T212Position[] = [];
    for (const pos of positions) {
      const cached = storage.getPriceData(pos.ticker);
      if (cached && isCacheValid(cached.timestamp, CACHE_MAX_AGE_MS)) {
        fresh.push(pos);
      } else {
        stale.push(pos);
      }
    }

    setLoadingProgress({ done: 0, total: stale.length });

    // Start with basic position data so the table is visible immediately
    const initial: PositionWithSignal[] = positions.map((pos) => {
      const cost = pos.averagePrice * pos.quantity;
      const totalValue = pos.currentPrice * pos.quantity;
      const pnlPct = cost > 0 ? ((totalValue - cost) / cost) * 100 : 0;
      return { ...pos, signal: null, signalScore: 0, pnlPct, totalValue };
    });
    setEnrichedPositions(initial);

    const allSignals: import('@/types').StockSignal[] = [];

    // Process fresh-cache positions first (no Yahoo calls)
    for (const pos of fresh) {
      try {
        const cached = storage.getPriceData(pos.ticker)!;
        const ohlcData = cached.data;

        const signals: import('@/types').StockSignal[] = [];
        for (const tf of TIMEFRAMES) {
          const data = ohlcData[tf];
          if (!data || data.length === 0) continue;
          const indicators = computeIndicators(data);
          const signal = computeSignals(pos.ticker, tf, data, indicators);
          signals.push(signal);
        }

        const composite = compositeScore(signals);
        allSignals.push(...signals);

        setEnrichedPositions((prev) =>
          prev.map((p) =>
            p.ticker === pos.ticker
              ? { ...p, signal: composite.strength, signalScore: composite.score }
              : p,
          ),
        );
      } catch {
        // Leave as default
      }
    }

    // Process stale positions (fetch from Yahoo)
    for (let i = 0; i < stale.length; i++) {
      const pos = stale[i];
      try {
        const ohlcData = await yahooFinance.getAllTimeframes(pos.ticker);
        storage.setPriceData(pos.ticker, ohlcData);

        const signals: import('@/types').StockSignal[] = [];
        for (const tf of TIMEFRAMES) {
          const data = ohlcData[tf];
          if (!data || data.length === 0) continue;
          const indicators = computeIndicators(data);
          const signal = computeSignals(pos.ticker, tf, data, indicators);
          signals.push(signal);
        }

        const composite = compositeScore(signals);
        allSignals.push(...signals);

        setEnrichedPositions((prev) =>
          prev.map((p) =>
            p.ticker === pos.ticker
              ? { ...p, signal: composite.strength, signalScore: composite.score }
              : p,
          ),
        );
      } catch {
        // Leave as default
      }

      setLoadingProgress({ done: i + 1, total: stale.length });
    }

    if (allSignals.length > 0) {
      storage.setSignals(allSignals);
    }

    setIsComputing(false);
  }, [positions]);

  // Initialise enriched positions when positions arrive.
  // - On first load, restores cached signals so the table is populated immediately.
  // - Only re-initialises if the set of tickers has actually changed.
  useEffect(() => {
    if (positions.length === 0) return;

    const tickerKey = positions.map((p) => p.ticker).sort().join(',');
    if (tickerKey === initialisedForTickers.current) return;
    initialisedForTickers.current = tickerKey;

    setEnrichedPositions(buildEnrichedPositions(positions));
  }, [positions]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...enrichedPositions];

    // Search filter (matches ticker or stock name)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const name = tickerNames[p.ticker] ?? '';
        return p.ticker.toLowerCase().includes(q) || name.toLowerCase().includes(q);
      });
    }

    // Signal filter
    if (signalFilter !== 'all') {
      result = result.filter((p) => p.signal === signalFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'ticker':
          cmp = a.ticker.localeCompare(b.ticker);
          break;
        case 'totalValue':
          cmp = a.totalValue - b.totalValue;
          break;
        case 'ppl':
          cmp = a.ppl - b.ppl;
          break;
        case 'pnlPct':
          cmp = a.pnlPct - b.pnlPct;
          break;
        case 'signal':
          cmp = getSignalSortValue(a.signal) - getSignalSortValue(b.signal);
          break;
        case 'quantity':
          cmp = a.quantity - b.quantity;
          break;
        case 'averagePrice':
          cmp = a.averagePrice - b.averagePrice;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [enrichedPositions, search, signalFilter, sortKey, sortDir, tickerNames]);

  if (!isConnected && !positionsLoading) {
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
      <h1 className="text-2xl font-bold">Portfolio</h1>

      {positionsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{positionsError}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by ticker or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={signalFilter} onValueChange={setSignalFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by signal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Signals</SelectItem>
            <SelectItem value="strong-buy">Strong Buy</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="hold">Hold</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
            <SelectItem value="strong-sell">Strong Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Load signals button */}
      {!isComputing && enrichedPositions.length > 0 && (
        <Button onClick={() => void computeSignalsForPositions()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Load Signals
        </Button>
      )}

      {/* Loading progress */}
      {isComputing && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>
            Loading price data... {loadingProgress.done}/{loadingProgress.total} stocks
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${loadingProgress.total > 0 ? (loadingProgress.done / loadingProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      {positionsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {([
                ['ticker', 'Ticker'],
                ['totalValue', 'Value'],
                ['ppl', 'P&L'],
                ['pnlPct', 'P&L %'],
                ['signal', 'Signal'],
                ['quantity', 'Qty'],
                ['averagePrice', 'Avg Price'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <TableHead
                  key={key}
                  className="cursor-pointer select-none"
                  onClick={() => handleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <ArrowUpDown className={cn(
                      'h-3 w-3',
                      sortKey === key ? 'text-foreground' : 'text-muted-foreground/50',
                    )} />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {enrichedPositions.length === 0
                    ? 'No positions found.'
                    : 'No positions match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((pos) => (
                <TableRow
                  key={pos.ticker}
                  className="cursor-pointer"
                  onClick={() => navigate(`/stock/${pos.ticker}`)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{pos.ticker}</span>
                      {tickerNames[pos.ticker] && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {tickerNames[pos.ticker]}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(pos.totalValue)}</TableCell>
                  <TableCell className={cn(pos.ppl >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatCurrency(pos.ppl)}
                  </TableCell>
                  <TableCell className={cn(pos.pnlPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {formatPercent(pos.pnlPct)}
                  </TableCell>
                  <TableCell>
                    {pos.signal ? (
                      <SignalBadge strength={pos.signal} score={pos.signalScore} />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{pos.quantity.toFixed(4)}</TableCell>
                  <TableCell>{formatCurrency(pos.averagePrice)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
