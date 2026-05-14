import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { T212Position } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface GainLossSummaryProps {
  positions: T212Position[];
  isLoading: boolean;
  accountCurrency: string;
}

export function GainLossSummary({ positions, isLoading, accountCurrency }: GainLossSummaryProps) {
  const gainers = positions.filter((p) => p.ppl + p.fxPpl > 0);
  const losers = positions.filter((p) => p.ppl + p.fxPpl < 0);

  const combinedGain = gainers.reduce((sum, p) => sum + p.ppl + p.fxPpl, 0);
  const combinedLoss = losers.reduce((sum, p) => sum + p.ppl + p.fxPpl, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="grid gap-4 md:grid-cols-2 w-full max-w-[calc(50%+0.5rem)]">
          {Array.from({ length: 2 }).map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="grid gap-4 md:grid-cols-2 w-full max-w-[calc(50%+0.5rem)]">
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
              from {gainers.length} {gainers.length === 1 ? 'stock' : 'stocks'}
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
              from {losers.length} {losers.length === 1 ? 'stock' : 'stocks'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
