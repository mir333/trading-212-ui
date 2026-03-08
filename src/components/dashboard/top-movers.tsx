import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { T212Position } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface TopMoversProps {
  positions: T212Position[];
  accountCurrency: string;
}

function pnlPercent(pos: T212Position): number {
  if (pos.averagePrice === 0) return 0;
  return ((pos.currentPrice - pos.averagePrice) / pos.averagePrice) * 100;
}

export function TopMovers({ positions, accountCurrency }: TopMoversProps) {
  const navigate = useNavigate();

  const sorted = [...positions].sort((a, b) => pnlPercent(b) - pnlPercent(a));
  const gainers = sorted.filter((p) => pnlPercent(p) > 0).slice(0, 5);
  const losers = sorted.filter((p) => pnlPercent(p) < 0).reverse().slice(0, 5);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">Top Gainers</CardTitle>
        </CardHeader>
        <CardContent>
          {gainers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gainers</p>
          ) : (
            <div className="space-y-2">
              {gainers.map((pos) => {
                const pct = pnlPercent(pos);
                return (
                  <div
                    key={pos.ticker}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                    onClick={() => navigate(`/stock/${pos.ticker}`)}
                  >
                    <span className="font-medium">{pos.ticker}</span>
                    <div className="text-right">
                      <span className="text-sm text-green-600">{formatPercent(pct)}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {formatCurrency(pos.ppl, accountCurrency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Top Losers</CardTitle>
        </CardHeader>
        <CardContent>
          {losers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No losers</p>
          ) : (
            <div className="space-y-2">
              {losers.map((pos) => {
                const pct = pnlPercent(pos);
                return (
                  <div
                    key={pos.ticker}
                    className="flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-muted"
                    onClick={() => navigate(`/stock/${pos.ticker}`)}
                  >
                    <span className="font-medium">{pos.ticker}</span>
                    <div className="text-right">
                      <span className="text-sm text-red-600">{formatPercent(pct)}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        {formatCurrency(pos.ppl, accountCurrency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
