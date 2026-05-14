import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { T212Cash, T212Position } from '@/types';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface AccountSummaryProps {
  cash: T212Cash | null;
  positions: T212Position[];
  isLoading: boolean;
  accountCurrency: string;
}

export function AccountSummary({ cash, positions, isLoading, accountCurrency }: AccountSummaryProps) {
  const portfolioValue = cash?.total ?? 0;
  const availableCash = cash?.free ?? 0;
  const totalPnL = cash?.result ?? 0;
  const invested = cash?.invested ?? 0;
  const pnlPercent = invested > 0 ? (totalPnL / invested) * 100 : 0;
  const positionCount = positions.length;

  const gainers = positions.filter((p) => p.ppl + p.fxPpl > 0);
  const losers = positions.filter((p) => p.ppl + p.fxPpl < 0);
  const combinedGain = gainers.reduce((sum, p) => sum + p.ppl + p.fxPpl, 0);
  const combinedLoss = losers.reduce((sum, p) => sum + p.ppl + p.fxPpl, 0);
  const totalFx = positions.reduce((sum, p) => sum + p.fxPpl, 0);
  const fxPositionCount = positions.filter((p) => p.fxPpl !== 0).length;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(portfolioValue, accountCurrency)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Cash</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(availableCash, accountCurrency)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P&amp;L</CardTitle>
          {totalPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', totalPnL >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatCurrency(totalPnL, accountCurrency)}
          </div>
          <p className={cn('text-xs', pnlPercent >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatPercent(pnlPercent)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Combined Gain</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(combinedGain, accountCurrency)}
          </div>
          <p className="text-xs text-muted-foreground">
            from {gainers.length} {gainers.length === 1 ? 'position' : 'positions'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Combined Loss</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(combinedLoss, accountCurrency)}
          </div>
          <p className="text-xs text-muted-foreground">
            from {losers.length} {losers.length === 1 ? 'position' : 'positions'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total FX Impact</CardTitle>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', totalFx >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatCurrency(totalFx, accountCurrency)}
          </div>
          <p className="text-xs text-muted-foreground">
            across {fxPositionCount} {fxPositionCount === 1 ? 'position' : 'positions'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Positions</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{positionCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
