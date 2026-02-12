import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppContext } from './layout';

export function Header() {
  const { isConnected, isLoading, refreshPositions } = useAppContext();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div />
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
