import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from './layout';
import { useYahooQueue } from '@/hooks/use-yahoo-queue';

export function Header() {
  const { isConnected, isLoading, refreshPositions } = useAppContext();
  const { queue, isProcessing, completed, total } = useYahooQueue();

  const currentItem = queue.find((i) => i.status === 'loading');
  const errors = queue.filter((i) => i.status === 'error').length;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      {/* Yahoo queue indicator */}
      <div className="flex items-center gap-2 min-w-0">
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="truncate">
              Loading {currentItem?.ticker ?? '...'}
            </span>
            <span className="text-xs tabular-nums">
              ({completed}/{total})
            </span>
          </div>
        )}
        {!isProcessing && total > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in">
            <span>
              Loaded {completed} ticker{completed !== 1 ? 's' : ''}
              {errors > 0 && (
                <span className="text-destructive ml-1">
                  ({errors} failed)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={isConnected ? 'default' : 'destructive'}>
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Disconnected
            </>
          )}
        </Badge>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => void refreshPositions()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          />
        </Button>
      </div>
    </header>
  );
}