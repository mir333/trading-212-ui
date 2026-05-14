import { useNavigate } from 'react-router-dom';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { T212Position } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface FxImpactProps {
  positions: T212Position[];
  isLoading: boolean;
  accountCurrency: string;
  tickerNames: Record<string, string>;
}

export function FxImpact({ positions, isLoading, accountCurrency, tickerNames }: FxImpactProps) {
  const navigate = useNavigate();

  const sorted = [...positions].sort((a, b) => b.fxPpl - a.fxPpl);
  const fxGainers = sorted.filter((p) => p.fxPpl > 0).slice(0, 5);
  const fxLosers = sorted.filter((p) => p.fxPpl < 0).reverse().slice(0, 5);

  const displayName = (ticker: string) => tickerNames[ticker] || ticker;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
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
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-medium truncate hover:underline">{displayName(pos.ticker)}</p>
                    <p className="text-xs text-muted-foreground">{pos.ticker}</p>
                  </div>
                  <span className="text-sm text-green-600 shrink-0">
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
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-medium truncate hover:underline">{displayName(pos.ticker)}</p>
                    <p className="text-xs text-muted-foreground">{pos.ticker}</p>
                  </div>
                  <span className="text-sm text-red-600 shrink-0">
                    {formatCurrency(pos.fxPpl, accountCurrency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
