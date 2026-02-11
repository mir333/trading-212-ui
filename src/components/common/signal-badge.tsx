import { Badge } from '@/components/ui/badge';
import type { SignalStrength } from '@/types';
import { cn } from '@/lib/utils';

const signalConfig: Record<SignalStrength, { label: string; className: string }> = {
  'strong-buy': { label: 'Strong Buy', className: 'bg-green-600 text-white hover:bg-green-700' },
  'buy': { label: 'Buy', className: 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30' },
  'hold': { label: 'Hold', className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30' },
  'sell': { label: 'Sell', className: 'bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500/30' },
  'strong-sell': { label: 'Strong Sell', className: 'bg-red-600 text-white hover:bg-red-700' },
};

interface SignalBadgeProps {
  strength: SignalStrength;
  score?: number;
  className?: string;
}

export function SignalBadge({ strength, score, className }: SignalBadgeProps) {
  const config = signalConfig[strength];
  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
      {score != null && ` (${score > 0 ? '+' : ''}${score})`}
    </Badge>
  );
}
