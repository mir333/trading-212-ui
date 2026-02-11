import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/components/layout/layout';
import { useTheme } from '@/hooks/use-theme';
import {
  getCredentials,
  setCredentials,
  getPreferences,
  setPreferences,
  clearAll,
} from '@/services/storage';
import { trading212 } from '@/services/trading212';

export default function Settings() {
  const { refresh } = useAppContext();
  const { theme, setTheme } = useTheme();

  // --- API credentials ---
  const savedCreds = getCredentials();
  const [apiKey, setApiKey] = useState(savedCreds?.apiKey ?? '');
  const [isDemo, setIsDemo] = useState(savedCreds?.isDemo ?? true);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- Polling ---
  const savedPrefs = getPreferences();
  const [posInterval, setPosInterval] = useState(savedPrefs.pollingIntervalPositions);
  const [priceInterval, setPriceInterval] = useState(savedPrefs.pollingIntervalPrices);

  async function handleTestConnection() {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setCredentials({ apiKey: apiKey.trim(), isDemo });
    setIsTesting(true);
    setConnectionStatus('idle');

    try {
      const ok = await trading212.testConnection();
      if (ok) {
        setConnectionStatus('success');
        toast.success('Connection successful!');
        await refresh();
      } else {
        setConnectionStatus('error');
        toast.error('Connection failed. Check your API key.');
      }
    } catch {
      setConnectionStatus('error');
      toast.error('Connection failed. Check your API key.');
    } finally {
      setIsTesting(false);
    }
  }

  function handleSavePolling() {
    setPreferences({
      pollingIntervalPositions: posInterval,
      pollingIntervalPrices: priceInterval,
    });
    toast.success('Polling settings saved');
  }

  function handleClearData() {
    clearAll();
    toast.success('All data cleared');
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Card 1: Trading 212 API */}
      <Card>
        <CardHeader>
          <CardTitle>Trading 212 API</CardTitle>
          <CardDescription>Configure your Trading 212 API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="demo-toggle">Demo Account</Label>
            <Switch
              id="demo-toggle"
              checked={isDemo}
              onCheckedChange={setIsDemo}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleTestConnection} disabled={isTesting}>
              {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save &amp; Test Connection
            </Button>
            {connectionStatus === 'success' && (
              <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge className="bg-red-500/20 text-red-700 dark:text-red-400">
                <XCircle className="mr-1 h-3 w-3" />
                Failed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Polling */}
      <Card>
        <CardHeader>
          <CardTitle>Polling</CardTitle>
          <CardDescription>Control how often data is refreshed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Position Refresh</Label>
              <span className="text-sm text-muted-foreground">{posInterval}s</span>
            </div>
            <Slider
              value={[posInterval]}
              onValueChange={([v]) => setPosInterval(v)}
              min={15}
              max={300}
              step={5}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Price Data Refresh</Label>
              <span className="text-sm text-muted-foreground">{priceInterval}s</span>
            </div>
            <Slider
              value={[priceInterval]}
              onValueChange={([v]) => setPriceInterval(v)}
              min={60}
              max={900}
              step={30}
            />
          </div>

          <Button onClick={handleSavePolling}>Save Polling Settings</Button>
        </CardContent>
      </Card>

      {/* Card 3: Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Manage stored application data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClearData}>
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
