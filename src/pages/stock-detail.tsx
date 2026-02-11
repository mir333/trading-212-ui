import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SignalBadge } from '@/components/common/signal-badge';
import { CandlestickChart } from '@/components/stock/candlestick-chart';
import { RSIPanel, MACDPanel } from '@/components/stock/indicator-panels';
import { SignalBreakdown } from '@/components/stock/signal-breakdown';
import { useAppContext } from '@/components/layout/layout';
import { usePriceData } from '@/hooks/use-price-data';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { Timeframe } from '@/types';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const { positions } = useAppContext();
  const {
    ohlcByTimeframe,
    indicatorsByTimeframe,
    signals,
    compositeSignal,
    compositeScoreValue,
    isLoading,
    error,
  } = usePriceData(ticker ?? null);

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('daily');
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRegression, setShowRegression] = useState(false);

  const position = useMemo(
    () => positions.find((p) => p.ticker === ticker) ?? null,
    [positions, ticker],
  );

  const currentData = ohlcByTimeframe[activeTimeframe] ?? [];
  const currentIndicators = indicatorsByTimeframe[activeTimeframe] ?? null;

  const pnl = position ? position.ppl + position.fxPpl : 0;
  const cost = position ? position.averagePrice * position.quantity : 0;
  const totalValue = position ? position.currentPrice * position.quantity : 0;
  const pnlPct = cost > 0 ? ((totalValue - cost) / cost) * 100 : 0;

  const regression = currentIndicators?.regression ?? null;
  const trendDirection = regression
    ? regression.slope > 0
      ? 'Upward'
      : regression.slope < 0
        ? 'Downward'
        : 'Flat'
    : null;

  if (!ticker) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No ticker specified.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/portfolio"
          className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{ticker}</h1>
          {!isLoading && (
            <SignalBadge strength={compositeSignal} score={compositeScoreValue} />
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : position ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-xl font-bold">{formatCurrency(position.currentPrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Avg Price</p>
              <p className="text-xl font-bold">{formatCurrency(position.averagePrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Quantity</p>
              <p className="text-xl font-bold">{position.quantity.toFixed(4)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">P&L</p>
              <p className={cn('text-xl font-bold', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(pnl)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">P&L %</p>
              <p className={cn('text-xl font-bold', pnlPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatPercent(pnlPct)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-muted-foreground">
          No position data found for {ticker}. Showing chart data only.
        </p>
      )}

      {/* Overlay toggles */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="sma" checked={showSMA} onCheckedChange={setShowSMA} />
          <Label htmlFor="sma">SMA</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ema" checked={showEMA} onCheckedChange={setShowEMA} />
          <Label htmlFor="ema">EMA</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="bollinger" checked={showBollinger} onCheckedChange={setShowBollinger} />
          <Label htmlFor="bollinger">Bollinger</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="regression" checked={showRegression} onCheckedChange={setShowRegression} />
          <Label htmlFor="regression">Regression</Label>
        </div>
      </div>

      {/* Timeframe tabs + chart */}
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <Tabs value={activeTimeframe} onValueChange={(v) => setActiveTimeframe(v as Timeframe)}>
          <TabsList>
            {TIMEFRAME_OPTIONS.map((tf) => (
              <TabsTrigger key={tf.value} value={tf.value}>
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TIMEFRAME_OPTIONS.map((tf) => (
            <TabsContent key={tf.value} value={tf.value}>
              {currentData.length > 0 ? (
                <CandlestickChart
                  data={currentData}
                  indicators={currentIndicators}
                  showSMA={showSMA}
                  showEMA={showEMA}
                  showBollinger={showBollinger}
                  showRegression={showRegression}
                />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No data available for {tf.label} timeframe.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* RSI and MACD panels */}
      {!isLoading && currentIndicators && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">RSI</CardTitle>
            </CardHeader>
            <CardContent>
              <RSIPanel indicators={currentIndicators} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">MACD</CardTitle>
            </CardHeader>
            <CardContent>
              <MACDPanel indicators={currentIndicators} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signal breakdown */}
      {!isLoading && signals.length > 0 && (
        <SignalBreakdown signals={signals} />
      )}

      {/* Regression analysis */}
      {!isLoading && regression && (
        <Card>
          <CardHeader>
            <CardTitle>Regression Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Slope</p>
                <p className="text-lg font-semibold">{regression.slope.toFixed(4)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">R-squared</p>
                <p className="text-lg font-semibold">{regression.rSquared.toFixed(4)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trend Direction</p>
                <div className="flex items-center gap-2">
                  {trendDirection === 'Upward' && (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  )}
                  {trendDirection === 'Downward' && (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  {trendDirection === 'Flat' && (
                    <Minus className="h-5 w-5 text-yellow-600" />
                  )}
                  <p className={cn(
                    'text-lg font-semibold',
                    trendDirection === 'Upward' && 'text-green-600',
                    trendDirection === 'Downward' && 'text-red-600',
                    trendDirection === 'Flat' && 'text-yellow-600',
                  )}>
                    {trendDirection}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
