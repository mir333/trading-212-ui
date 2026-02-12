import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Trash2, HelpCircle, Info, KeyRound } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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

function ApiKeyHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HelpCircle className="h-4 w-4" />
          How do I get my credentials?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>How to Get Your Trading 212 API Credentials</DialogTitle>
          <DialogDescription>
            Follow these steps to generate an API key and secret from your Trading 212 account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Prerequisites */}
          <div className="space-y-2">
            <h3 className="font-semibold">Prerequisites</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>A Trading 212 account (<strong>Invest</strong> or <strong>Stocks ISA</strong> account type)</li>
              <li>The Trading 212 mobile app or web platform</li>
              <li>CFD accounts are <strong>not supported</strong> by the API</li>
            </ul>
          </div>

          <Separator />

          {/* Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold">Step-by-Step Instructions</h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Open Trading 212</p>
                  <p className="text-sm text-muted-foreground">
                    Log in to your Trading 212 account via the mobile app or web platform.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Navigate to Settings</p>
                  <p className="text-sm text-muted-foreground">
                    Tap/click on your profile icon or the menu, then select <strong>Settings</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Find the API section</p>
                  <p className="text-sm text-muted-foreground">
                    Scroll down to find <strong>API (Beta)</strong>. If you don't see it, your account type may not support the API yet.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">4</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Generate a new API key</p>
                  <p className="text-sm text-muted-foreground">
                    Tap <strong>Generate API Key</strong>. You will receive two values:
                  </p>
                  <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground pl-1">
                    <li><strong>API Key</strong> - your username/identifier</li>
                    <li><strong>API Secret</strong> - your password (shown only once!)</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">5</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Copy both values immediately</p>
                  <p className="text-sm text-muted-foreground">
                    Copy both the <strong>API Key</strong> and <strong>API Secret</strong> and paste them into the corresponding fields on this page. <strong>The secret is only shown once</strong> - if you lose it, you'll need to generate a new key pair.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">6</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Choose account type</p>
                  <p className="text-sm text-muted-foreground">
                    Toggle <strong>Demo Account</strong> on if your key is from a Practice/Demo account, or leave it off for your Live account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">7</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Test the connection</p>
                  <p className="text-sm text-muted-foreground">
                    Click <strong>Save & Test Connection</strong> to verify everything works. The app automatically encodes your credentials (Base64) for API authentication - you don't need to do this yourself. You should see a green "Connected" badge.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">Security & Privacy</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Your API key and secret are stored <strong>only in your browser's localStorage</strong></li>
              <li>They are <strong>never sent to any third-party server</strong> - requests go directly to Trading 212 via a local proxy</li>
              <li>The Base64 encoding needed for authentication is <strong>computed automatically</strong> in your browser</li>
              <li>The API provides <strong>read-only access</strong> to your portfolio data</li>
              <li>You can revoke the key at any time from the Trading 212 app</li>
              <li>Clearing your browser data or clicking "Clear All Data" in settings will remove the key</li>
            </ul>
          </div>

          <Separator />

          {/* Limitations */}
          <div className="space-y-2">
            <h3 className="font-semibold">API Limitations</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>The API is currently in <strong>Beta</strong> and may change</li>
              <li>Rate limits apply (typically 1 request per 5 seconds for account data)</li>
              <li>Only <strong>Invest</strong> and <strong>Stocks ISA</strong> accounts are supported</li>
              <li>Historical price charts are provided by Yahoo Finance, not Trading 212</li>
            </ul>
          </div>

          <Separator />

          {/* Troubleshooting */}
          <div className="space-y-2">
            <h3 className="font-semibold">Troubleshooting</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Connection failed?</strong> Check that:</p>
              <ul className="list-inside list-disc space-y-1 pl-2">
                <li>Your API key and secret are correct (no extra spaces)</li>
                <li>You selected the right account type (Live vs Demo)</li>
                <li>Your Trading 212 account is an Invest or ISA account</li>
                <li>The API key hasn't been revoked in the Trading 212 app</li>
                <li>The development server is running (this app requires the Vite proxy)</li>
              </ul>
              <p><strong>Can't find API settings?</strong> The API feature may not be available in all regions or for all account types. Check the Trading 212 help centre for the latest availability.</p>
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

export default function Settings() {
  const { refreshPositions } = useAppContext();
  const { theme, setTheme } = useTheme();

  // --- API credentials ---
  const savedCreds = getCredentials();
  const [apiKey, setApiKey] = useState(savedCreds?.apiKey ?? '');
  const [apiSecret, setApiSecret] = useState(savedCreds?.apiSecret ?? '');
  const [isDemo, setIsDemo] = useState(savedCreds?.isDemo ?? true);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- Polling ---
  const savedPrefs = getPreferences();
  const [posInterval, setPosInterval] = useState(savedPrefs.pollingIntervalPositions);
  const [priceInterval, setPriceInterval] = useState(savedPrefs.pollingIntervalPrices);

  async function handleTestConnection() {
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error('Please enter both API key and API secret');
      return;
    }

    setCredentials({ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), isDemo });
    setIsTesting(true);
    setConnectionStatus('idle');

    try {
      const ok = await trading212.testConnection();
      if (ok) {
        setConnectionStatus('success');
        toast.success('Connection successful!');
        await refreshPositions();
      } else {
        setConnectionStatus('error');
        toast.error('Connection failed. Check your API key and secret.');
      }
    } catch {
      setConnectionStatus('error');
      toast.error('Connection failed. Check your API key and secret.');
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

      {/* Quick Start Guide */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Getting started:</strong> Enter your Trading 212 API key and secret below to connect your portfolio.
          Your credentials are stored locally in your browser and never sent to any third-party server.
          The Base64 encoding required for authentication is computed automatically.
          Click <strong>"How do I get my credentials?"</strong> for step-by-step instructions.
        </AlertDescription>
      </Alert>

      {/* Card 1: Trading 212 API */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <CardTitle>Trading 212 API</CardTitle>
              <CardDescription>Configure your Trading 212 API credentials</CardDescription>
            </div>
            <ApiKeyHelpDialog />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Paste your API key here"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-secret">API Secret</Label>
            <Input
              id="api-secret"
              type="password"
              placeholder="Paste your API secret here"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <KeyRound className="mr-1 inline h-3 w-3" />
              Your key and secret are stored locally in your browser. The Base64-encoded
              authorization header is computed automatically when making API requests.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="demo-toggle">Demo Account</Label>
              <p className="text-xs text-muted-foreground">
                Enable this if your key is from a Practice/Demo account
              </p>
            </div>
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
