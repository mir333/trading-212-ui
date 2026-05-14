import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { T212Position } from '@/types';
import { formatCurrency, cn } from '@/lib/utils';

interface FxImpactProps {
  positions: T212Position[];
  isLoading: boolean;
  accountCurrency: string;
}

export function FxImpact({ positions, isLoading, accountCurrency }: FxImpactProps) {
  const navigate = useNavigate();

  const totalFx = positions.reduce((sum, p) => sum + p.fxPpl, 0);

  const sorted = [...positions].sort((a, b) => b.fxPpl - a.fxPpl);
  const fxGainers = sorted.filter((p) => p.fxPpl > 0).slice(0, 5);
  const fxLosers = sorted.filter((p) => p.fxPpl < 0).reverse().slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="w-full max-w-[calc(25%+0.5rem)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total FX Impact summary card */}
      <div className="flex justify-center">
        <div className="w-full max-w-[calc(25%+0.5rem)]">
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
                across {positions.filter((p) => p.fxPpl !== 0).length}{' '}
                {positions.filter((p) => p.fxPpl !== 0).length === 1 ? 'stock' : 'stocks'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FX Gainers / Losers lists */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              <CardTitle className="text-green-600">Biggest FX Gains</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {fxGainers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No FX gains</p>
            ) : (
              <div className="space-y-2">
                {fxGainers.map((pos) => (
                  <div
                    key={pos.ticker}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                    onClick={() => navigate(`/stock/${pos.ticker}`)}
                  >
                    <span className="font-medium">{pos.ticker}</span>
                    <span className="text-sm text-green-600">
                      {formatCurrency(pos.fxPpl, accountCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              <CardTitle className="text-red-600">Biggest FX Losses</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {fxLosers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No FX losses</p>
            ) : (
              <div className="space-y-2">
                {fxLosers.map((pos) => (
                  <div
                    key={pos.ticker}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                    onClick={() => navigate(`/stock/${pos.ticker}`)}
                  >
                    <span className="font-medium">{pos.ticker}</span>
                    <span className="text-sm text-red-600">
                      {formatCurrency(pos.fxPpl, accountCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
