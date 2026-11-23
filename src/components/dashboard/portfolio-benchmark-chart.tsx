import { useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortfolioHistory } from '@/hooks/use-portfolio-history';
import { BENCHMARKS, DEFAULT_BENCHMARK_ID } from '@/lib/benchmarks';
import { buildComparison, type Comparison } from '@/lib/benchmark-comparison';
import { rangeStartDate } from '@/lib/dates';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import type { HistoryRange, T212Position } from '@/types';
import { PortfolioBenchmarkLineChart } from './portfolio-benchmark-line-chart';
import { PortfolioBenchmarkNotices, type QuantityMismatch } from './portfolio-benchmark-notices';

const RANGES: { value: HistoryRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
];

const QTY_TOLERANCE = 0.0001;
const ACCURACY_WARN_PCT = 2;

const shortLabel = (benchmarkId: string): string => benchmarkId.replace(/\.L$/, '');

interface PortfolioBenchmarkChartProps {
  accountCurrency: string;
  /** False until the real account currency is known; nothing loads before. */
  accountLoaded: boolean;
  accountId: number | null;
  /** T212 instrument currency per ticker (empty until instruments load). */
  tickerCurrencies: Record<string, string>;
  liveTotal: number | null;
  livePositions: T212Position[];
  /** False until live positions were fetched successfully; the quantity check waits for it. */
  positionsLoaded: boolean;
}

export function PortfolioBenchmarkChart({
  accountCurrency,
  accountLoaded,
  accountId,
  tickerCurrencies,
  liveTotal,
  livePositions,
  positionsLoaded,
}: PortfolioBenchmarkChartProps) {
  const [range, setRange] = useState<HistoryRange>('ALL');
  const [benchmarkId, setBenchmarkId] = useState(DEFAULT_BENCHMARK_ID);
  const { status, progress, error, reconstruction, benchmarkPrices, refresh } = usePortfolioHistory(
    accountLoaded ? accountCurrency : null,
    accountId,
    benchmarkId,
    tickerCurrencies,
  );
  const short = shortLabel(benchmarkId);

  const result = useMemo((): { comparison: Comparison } | { error: string } | null => {
    if (!reconstruction || reconstruction.points.length === 0 || !benchmarkPrices) return null;
    const { points } = reconstruction;
    const start = rangeStartDate(range, points[points.length - 1].date, points[0].date);
    try {
      return { comparison: buildComparison(reconstruction, benchmarkPrices, start) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [reconstruction, benchmarkPrices, range]);

  const mismatches = useMemo((): QuantityMismatch[] => {
    // Without real live positions every holding would read "live 0".
    if (!reconstruction || !positionsLoaded) return [];
    const live: Record<string, number> = {};
    for (const p of livePositions) live[p.ticker] = p.quantity;
    const tickers = new Set([...Object.keys(reconstruction.holdingsToday), ...Object.keys(live)]);
    return [...tickers]
      .map((ticker) => ({ ticker, history: reconstruction.holdingsToday[ticker] ?? 0, live: live[ticker] ?? 0 }))
      .filter((m) => Math.abs(m.history - m.live) > QTY_TOLERANCE)
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [reconstruction, livePositions, positionsLoaded]);

  const busy = status === 'syncing';
  const comparison = result && 'comparison' in result ? result.comparison : null;
  const delta = comparison ? comparison.myValue - comparison.benchmarkValue : 0;
  const deltaPct = comparison && comparison.benchmarkValue !== 0 ? (delta / comparison.benchmarkValue) * 100 : null;
  const accuracyPct =
    reconstruction && liveTotal ? ((reconstruction.valueToday - liveTotal) / liveTotal) * 100 : null;
  const fmt = (v: number) => formatCurrency(v, accountCurrency);

  let body: ReactNode;
  if (!accountLoaded) {
    body = <p className="py-12 text-center text-sm text-muted-foreground">Waiting for account info…</p>;
  } else if (status === 'idle' || busy) {
    body = (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {progress || 'Syncing history…'}
      </div>
    );
  } else if (status === 'error' || (result && 'error' in result)) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Couldn&apos;t build the comparison</AlertTitle>
        <AlertDescription>{error ?? (result && 'error' in result ? result.error : null)}</AlertDescription>
      </Alert>
    );
  } else if (!reconstruction || reconstruction.points.length === 0) {
    body = <p className="py-12 text-center text-sm text-muted-foreground">No account history yet.</p>;
  } else if (comparison) {
    body = (
      <div className="space-y-4">
        <PortfolioBenchmarkLineChart
          data={comparison.data}
          currency={accountCurrency}
          benchmarkLabel={`If invested in ${short}`}
        />
        <div className="space-y-1 text-sm">
          <p>
            My account <span className="font-semibold">{fmt(comparison.myValue)}</span>
            {' · '}
            {short} alternative <span className="font-semibold">{fmt(comparison.benchmarkValue)}</span>
            {' · '}
            <span className={cn('font-semibold', delta >= 0 ? 'text-green-600' : 'text-red-600')}>
              Δ {delta >= 0 ? '+' : ''}
              {fmt(delta)}
              {deltaPct !== null && ` (${formatPercent(deltaPct)})`}
            </span>
          </p>
          <p className="text-muted-foreground">
            Deposited {fmt(comparison.deposited)}
            {' · '}
            {accuracyPct === null ? (
              <span>Live account value not loaded; reconstruction accuracy unknown</span>
            ) : (
              <span className={cn(Math.abs(accuracyPct) > ACCURACY_WARN_PCT && 'font-semibold text-destructive')}>
                Reconstruction within {Math.abs(accuracyPct).toFixed(1)}% of live value
              </span>
            )}
          </p>
        </div>
        <PortfolioBenchmarkNotices
          unpricedTickers={reconstruction.unpricedTickers}
          mismatches={mismatches}
          shortfall={comparison.shortfall}
          benchmarkStartsOn={comparison.benchmarkStartsOn}
          benchmarkShortLabel={short}
          accountCurrency={accountCurrency}
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Portfolio vs benchmark</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={range} onValueChange={(v) => setRange(v as HistoryRange)}>
              <TabsList>
                {RANGES.map((r) => (
                  <TabsTrigger key={r.value} value={r.value}>
                    {r.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={refresh}
              disabled={!accountLoaded || busy}
              aria-label="Refresh history"
              title="Refresh history"
            >
              <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Benchmark:</span>
          <Select value={benchmarkId} onValueChange={setBenchmarkId}>
            <SelectTrigger className="w-[260px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BENCHMARKS.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
