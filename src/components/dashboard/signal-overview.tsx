import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SignalStrength } from '@/types';

const signalLabels: { key: SignalStrength; label: string; color: string }[] = [
  { key: 'strong-buy', label: 'Strong Buy', color: 'bg-green-600' },
  { key: 'buy', label: 'Buy', color: 'bg-green-400' },
  { key: 'hold', label: 'Hold', color: 'bg-yellow-400' },
  { key: 'sell', label: 'Sell', color: 'bg-red-400' },
  { key: 'strong-sell', label: 'Strong Sell', color: 'bg-red-600' },
];

interface SignalOverviewProps {
  signals: Record<SignalStrength, number>;
}

export function SignalOverview({ signals }: SignalOverviewProps) {
  const total = Object.values(signals).reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signal Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No signals yet</p>
        ) : (
          <div className="space-y-3">
            {signalLabels.map(({ key, label, color }) => {
              const count = signals[key];
              const pct = (count / total) * 100;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
                  <span className="w-24 text-sm">{label}</span>
                  <div className="flex-1 rounded-full bg-muted h-2">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
