import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignalBadge } from '@/components/common/signal-badge';
import { MetricHelp, getSignalDetailKey } from '@/components/common/metric-help';
import type { StockSignal } from '@/types';
import { cn } from '@/lib/utils';

interface SignalBreakdownProps {
  signals: StockSignal[];
}

function getDetailLabel(value: number): { text: string; className: string } {
  if (value > 0) return { text: 'Bullish', className: 'text-green-600 dark:text-green-400' };
  if (value < 0) return { text: 'Bearish', className: 'text-red-600 dark:text-red-400' };
  return { text: 'Neutral', className: 'text-yellow-600 dark:text-yellow-400' };
}

export function SignalBreakdown({ signals }: SignalBreakdownProps) {
  if (signals.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Signal Breakdown</h3>
        <MetricHelp metricKey="signalBreakdown" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {signals.map((signal) => (
          <Card key={signal.timeframe}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm capitalize">{signal.timeframe}</CardTitle>
                <SignalBadge strength={signal.strength} score={signal.score} />
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {signal.details.map((detail) => {
                  const label = getDetailLabel(detail.value);
                  const helpKey = getSignalDetailKey(detail.name);
                  return (
                    <li key={detail.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {detail.name}
                        {helpKey && <MetricHelp metricKey={helpKey} />}
                      </span>
                      <span className={cn('font-medium', label.className)}>
                        {label.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
