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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Signal Breakdown</CardTitle>
          <MetricHelp metricKey="signalBreakdown" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.timeframe} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium capitalize">{signal.timeframe}</span>
              <SignalBadge strength={signal.strength} score={signal.score} />
            </div>
            <ul className="ml-4 space-y-1">
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
