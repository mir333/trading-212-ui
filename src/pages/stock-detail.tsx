import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SignalBadge } from '@/components/common/signal-badge';
import { MetricHelp } from '@/components/common/metric-help';
import { CandlestickChart } from '@/components/stock/candlestick-chart';
import { RSIPanel, MACDPanel } from '@/components/stock/indicator-panels';
import { SignalBreakdown } from '@/components/stock/signal-breakdown';
import { useAppContext } from '@/components/layout/layout';
import { usePriceData } from '@/hooks/use-price-data';
import { resolveYahooTicker } from '@/services/yahoo-finance';
import { setTickerMapping } from '@/services/storage';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import type { Timeframe } from '@/types';

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const { positions, tickerNames } = useAppContext();
  const {
    ohlcByTimeframe,
    indicatorsByTimeframe,
    signals,
    compositeSignal,
    compositeScoreValue,
    isLoading,
    error,
    refresh,
  } = usePriceData(ticker ?? null);

  const hasData = Object.keys(ohlcByTimeframe).length > 0;

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('daily');
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRegression, setShowRegression] = useState(false);

  // Yahoo ticker override
  const [isEditingYahoo, setIsEditingYahoo] = useState(false);
  const [yahooTickerDraft, setYahooTickerDraft] = useState('');

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
          <div>
            <h1 className="text-2xl font-bold">{ticker}</h1>
            {tickerNames[ticker] && (
              <p className="text-sm text-muted-foreground">{tickerNames[ticker]}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              {isEditingYahoo ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={yahooTickerDraft}
                    onChange={(e) => setYahooTickerDraft(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL"
                    className="h-6 w-28 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setTickerMapping(ticker, yahooTickerDraft.trim());
                        setIsEditingYahoo(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingYahoo(false);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setTickerMapping(ticker, yahooTickerDraft.trim());
                      setIsEditingYahoo(false);
                    }}
                  >
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsEditingYahoo(false)}
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {
                    setYahooTickerDraft(resolveYahooTicker(ticker));
                    setIsEditingYahoo(true);
                  }}
                >
                  <span>Yahoo: {resolveYahooTicker(ticker)}</span>
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          {hasData && (
            <>
              <SignalBadge strength={compositeSignal} score={compositeScoreValue} />
              <MetricHelp metricKey="compositeSignal" />
            </>
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
      {position ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground">Current Price</p>
                <MetricHelp metricKey="currentPrice" />
              </div>
              <p className="text-xl font-bold">{formatCurrency(position.currentPrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground">Avg Price</p>
                <MetricHelp metricKey="avgPrice" />
              </div>
              <p className="text-xl font-bold">{formatCurrency(position.averagePrice)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground">Quantity</p>
                <MetricHelp metricKey="quantity" />
              </div>
              <p className="text-xl font-bold">{position.quantity.toFixed(4)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground">P&L</p>
                <MetricHelp metricKey="pnl" />
              </div>
              <p className={cn('text-xl font-bold', pnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(pnl)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-muted-foreground">P&L %</p>
                <MetricHelp metricKey="pnlPct" />
              </div>
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

      {/* Load chart data button */}
      {!hasData && !isLoading && (
        <Button onClick={() => void refresh()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Load Chart Data
        </Button>
      )}

      {isLoading && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading price data and computing indicators...</span>
        </div>
      )}

      {/* Overlay toggles */}
      {hasData && (
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch id="sma" checked={showSMA} onCheckedChange={setShowSMA} />
            <Label htmlFor="sma">SMA</Label>
            <MetricHelp metricKey="sma" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ema" checked={showEMA} onCheckedChange={setShowEMA} />
            <Label htmlFor="ema">EMA</Label>
            <MetricHelp metricKey="ema" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="bollinger" checked={showBollinger} onCheckedChange={setShowBollinger} />
            <Label htmlFor="bollinger">Bollinger</Label>
            <MetricHelp metricKey="bollinger" />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="regression" checked={showRegression} onCheckedChange={setShowRegression} />
            <Label htmlFor="regression">Regression</Label>
            <MetricHelp metricKey="regression" />
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} className="gap-2 ml-auto">
            <RefreshCw className="h-4 w-4" />
            Reload
          </Button>
        </div>
      )}

      {/* Timeframe tabs + chart */}
      {hasData && (
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
      {hasData && currentIndicators && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">RSI</CardTitle>
                <MetricHelp metricKey="rsi" />
              </div>
            </CardHeader>
            <CardContent>
              <RSIPanel indicators={currentIndicators} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">MACD</CardTitle>
                <MetricHelp metricKey="macd" />
              </div>
            </CardHeader>
            <CardContent>
              <MACDPanel indicators={currentIndicators} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Signal breakdown */}
      {hasData && signals.length > 0 && (
        <SignalBreakdown signals={signals} />
      )}

      {/* Regression analysis */}
      {hasData && regression && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Regression Analysis</CardTitle>
              <MetricHelp metricKey="regression" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">Slope</p>
                  <MetricHelp metricKey="slope" />
                </div>
                <p className="text-lg font-semibold">{regression.slope.toFixed(4)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">R-squared</p>
                  <MetricHelp metricKey="rSquared" />
                </div>
                <p className="text-lg font-semibold">{regression.rSquared.toFixed(4)}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground">Trend Direction</p>
                  <MetricHelp metricKey="trendDirection" />
                </div>
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
