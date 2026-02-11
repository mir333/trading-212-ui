# Trading 212 Portfolio Dashboard - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based React dashboard that connects to Trading 212 API, displays portfolio positions with candlestick charts, applies technical analysis (SMA, EMA, RSI, MACD, Bollinger Bands, linear regression trendlines), and generates buy/sell signals across multiple timeframes.

**Architecture:** Single-page React app with Vite dev server proxy handling CORS for Trading 212 and Yahoo Finance APIs. All data persisted in localStorage. Polling engine refreshes portfolio positions and price data on configurable intervals. Technical analysis computed client-side.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Lightweight Charts (TradingView), React Router

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `components.json`

**Step 1: Scaffold Vite React TypeScript project**

Run:
```bash
cd /data/git/mir333/trading-212-atomation
npm create vite@latest . -- --template react-ts
```

**Step 2: Install core dependencies**

Run:
```bash
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom lightweight-charts lucide-react
npm install class-variance-authority clsx tailwind-merge
```

**Step 3: Configure Tailwind**

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

Update `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/t212': {
        target: 'https://live.trading212.com/api/v0',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/t212/, ''),
        headers: { 'Origin': 'https://live.trading212.com' },
      },
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
      },
    },
  },
})
```

**Step 4: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Then add required components:
```bash
npx shadcn@latest add button card input label tabs table badge separator select slider switch dialog alert dropdown-menu toast sonner skeleton
```

**Step 5: Update tsconfig paths**

Ensure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Also ensure `tsconfig.app.json` has the same paths config.

**Step 6: Verify app runs**

Run: `npm run dev`
Expected: App starts on localhost:5173

**Step 7: Commit**

```bash
git init
echo "node_modules\ndist\n.env" > .gitignore
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind + shadcn/ui project"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/trading212.ts`
- Create: `src/types/yahoo-finance.ts`
- Create: `src/types/indicators.ts`
- Create: `src/types/index.ts`

**Step 1: Create Trading 212 types**

File `src/types/trading212.ts`:
```ts
export interface T212Account {
  id: number;
  currencyCode: string;
}

export interface T212Cash {
  free: number;
  invested: number;
  pipiResult: number;
  result: number;
  total: number;
}

export interface T212Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl: number;
  initialFillDate: string;
  frontend: string;
  maxBuy: number;
  maxSell: number;
  pieQuantity: number;
}

export interface T212Instrument {
  ticker: string;
  name: string;
  type: string;
  currencyCode: string;
  isin: string;
  shortname: string;
  addedOn: string;
  maxOpenQuantity: number;
  minTradeQuantity: number;
  workingScheduleId: number;
}

export interface T212HistoryItem {
  executor: string;
  ticker: string;
  quantity: number;
  price: number;
  dateExecuted: string;
  dateCreated: string;
  dateModified: string;
  orderId: number;
  type: string;
  fillResult: number;
  fillPrice: number;
  fillQuantity: number;
  fillCost: number;
  fillType: string;
}

export interface T212PaginatedResponse<T> {
  items: T[];
  nextPagePath: string | null;
}

export interface T212Credentials {
  apiKey: string;
  isDemo: boolean;
}
```

**Step 2: Create Yahoo Finance types**

File `src/types/yahoo-finance.ts`:
```ts
export interface YahooChartResult {
  meta: {
    currency: string;
    symbol: string;
    exchangeName: string;
    instrumentType: string;
    regularMarketPrice: number;
    previousClose: number;
  };
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
    }>;
    adjclose?: Array<{
      adjclose: number[];
    }>;
  };
}

export interface YahooChartResponse {
  chart: {
    result: YahooChartResult[];
    error: null | { code: string; description: string };
  };
}

export interface OHLCData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface TimeframeConfig {
  label: string;
  yahooInterval: string;
  yahooRange: string;
  periods: number; // how many data points to fetch
}
```

**Step 3: Create indicator types**

File `src/types/indicators.ts`:
```ts
import type { OHLCData } from './yahoo-finance';

export interface SMAData {
  time: string;
  value: number;
}

export interface EMAData {
  time: string;
  value: number;
}

export interface RSIData {
  time: string;
  value: number;
}

export interface MACDData {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerData {
  time: string;
  upper: number;
  middle: number;
  lower: number;
}

export interface RegressionLine {
  time: string;
  value: number;
}

export interface RegressionResult {
  line: RegressionLine[];
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface TechnicalIndicators {
  sma20: SMAData[];
  sma50: SMAData[];
  ema12: EMAData[];
  ema26: EMAData[];
  rsi: RSIData[];
  macd: MACDData[];
  bollinger: BollingerData[];
  regression: RegressionResult;
}

export type SignalStrength = 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell';

export interface SignalDetail {
  name: string;
  value: number; // -1 to 1
  description: string;
}

export interface StockSignal {
  ticker: string;
  timeframe: string;
  score: number; // -100 to 100
  strength: SignalStrength;
  details: SignalDetail[];
}

export interface PortfolioStock {
  position: {
    ticker: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    ppl: number;
  };
  instrumentName: string;
  ohlc: Record<string, OHLCData[]>; // keyed by timeframe
  indicators: Record<string, TechnicalIndicators>; // keyed by timeframe
  signals: StockSignal[];
  compositeSignal: SignalStrength;
  compositeScore: number;
}
```

**Step 4: Create barrel export**

File `src/types/index.ts`:
```ts
export * from './trading212';
export * from './yahoo-finance';
export * from './indicators';
```

**Step 5: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript type definitions for T212, Yahoo Finance, and indicators"
```

---

### Task 3: Storage Service

**Files:**
- Create: `src/services/storage.ts`

**Step 1: Implement localStorage wrapper**

File `src/services/storage.ts`:
```ts
import type { T212Credentials, OHLCData } from '@/types';

const KEYS = {
  CREDENTIALS: 't212_credentials',
  POSITIONS: 'portfolio_positions',
  PREFERENCES: 'user_preferences',
  SIGNALS: 'signals_cache',
  INSTRUMENTS: 'instruments_cache',
} as const;

function priceKey(ticker: string): string {
  return `price_cache_${ticker}`;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface UserPreferences {
  pollingIntervalPositions: number; // seconds
  pollingIntervalPrices: number; // seconds
  theme: 'light' | 'dark' | 'system';
  enabledTimeframes: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  pollingIntervalPositions: 60,
  pollingIntervalPrices: 300,
  theme: 'system',
  enabledTimeframes: ['daily', 'weekly', 'biweekly', 'monthly'],
};

export const storage = {
  // Credentials
  getCredentials(): T212Credentials | null {
    const raw = localStorage.getItem(KEYS.CREDENTIALS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setCredentials(creds: T212Credentials): void {
    localStorage.setItem(KEYS.CREDENTIALS, JSON.stringify(creds));
  },

  clearCredentials(): void {
    localStorage.removeItem(KEYS.CREDENTIALS);
  },

  // Positions
  getPositions<T>(): CachedData<T> | null {
    const raw = localStorage.getItem(KEYS.POSITIONS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setPositions<T>(data: T): void {
    const cached: CachedData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(KEYS.POSITIONS, JSON.stringify(cached));
  },

  // Price data
  getPriceData(ticker: string): CachedData<Record<string, OHLCData[]>> | null {
    const raw = localStorage.getItem(priceKey(ticker));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setPriceData(ticker: string, data: Record<string, OHLCData[]>): void {
    const cached: CachedData<Record<string, OHLCData[]>> = { data, timestamp: Date.now() };
    localStorage.setItem(priceKey(ticker), JSON.stringify(cached));
  },

  isCacheValid(timestamp: number, maxAgeMs: number): boolean {
    return Date.now() - timestamp < maxAgeMs;
  },

  // Preferences
  getPreferences(): UserPreferences {
    const raw = localStorage.getItem(KEYS.PREFERENCES);
    if (!raw) return DEFAULT_PREFERENCES;
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  setPreferences(prefs: Partial<UserPreferences>): void {
    const current = storage.getPreferences();
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify({ ...current, ...prefs }));
  },

  // Instruments
  getInstruments<T>(): CachedData<T> | null {
    const raw = localStorage.getItem(KEYS.INSTRUMENTS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setInstruments<T>(data: T): void {
    const cached: CachedData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(KEYS.INSTRUMENTS, JSON.stringify(cached));
  },

  // Signals
  getSignals<T>(): CachedData<T> | null {
    const raw = localStorage.getItem(KEYS.SIGNALS);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSignals<T>(data: T): void {
    const cached: CachedData<T> = { data, timestamp: Date.now() };
    localStorage.setItem(KEYS.SIGNALS, JSON.stringify(cached));
  },

  clearAll(): void {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    // Clear price caches
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('price_cache_')) {
        localStorage.removeItem(key);
      }
    }
  },
};
```

**Step 2: Commit**

```bash
git add src/services/storage.ts
git commit -m "feat: add localStorage wrapper service"
```

---

### Task 4: API Services

**Files:**
- Create: `src/services/trading212.ts`
- Create: `src/services/yahoo-finance.ts`

**Step 1: Implement Trading 212 API client**

File `src/services/trading212.ts`:
```ts
import type {
  T212Position,
  T212Cash,
  T212Instrument,
  T212PaginatedResponse,
  T212Credentials,
  T212HistoryItem,
} from '@/types';
import { storage } from './storage';

function getBaseUrl(): string {
  const creds = storage.getCredentials();
  if (creds?.isDemo) return '/api/t212-demo';
  return '/api/t212';
}

function getHeaders(): HeadersInit {
  const creds = storage.getCredentials();
  if (!creds) throw new Error('No Trading 212 credentials configured');
  return {
    Authorization: creds.apiKey,
    'Content-Type': 'application/json',
  };
}

async function fetchT212<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Trading 212 API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function fetchAllPages<T>(endpoint: string): Promise<T[]> {
  const items: T[] = [];
  let nextPath: string | null = endpoint;

  while (nextPath) {
    const response: T212PaginatedResponse<T> = await fetchT212(nextPath);
    items.push(...response.items);
    nextPath = response.nextPagePath;
  }

  return items;
}

export const trading212 = {
  async getAccountCash(): Promise<T212Cash> {
    return fetchT212<T212Cash>('/equity/account/cash');
  },

  async getPositions(): Promise<T212Position[]> {
    const response = await fetchT212<T212Position[]>('/equity/portfolio');
    return response;
  },

  async getInstruments(): Promise<T212Instrument[]> {
    return fetchAllPages<T212Instrument>('/equity/metadata/instruments');
  },

  async getOrderHistory(cursor?: string, limit = 50): Promise<T212PaginatedResponse<T212HistoryItem>> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return fetchT212(`/equity/history/orders?${params}`);
  },

  async testConnection(): Promise<boolean> {
    try {
      await fetchT212('/equity/account/cash');
      return true;
    } catch {
      return false;
    }
  },
};
```

**Step 2: Implement Yahoo Finance API client**

File `src/services/yahoo-finance.ts`:
```ts
import type { YahooChartResponse, OHLCData, Timeframe, TimeframeConfig } from '@/types';

export const TIMEFRAME_CONFIGS: Record<Timeframe, TimeframeConfig> = {
  daily: { label: 'Daily', yahooInterval: '1d', yahooRange: '6mo', periods: 180 },
  weekly: { label: 'Weekly', yahooInterval: '1wk', yahooRange: '2y', periods: 104 },
  biweekly: { label: 'Biweekly', yahooInterval: '1wk', yahooRange: '2y', periods: 104 },
  monthly: { label: 'Monthly', yahooInterval: '1mo', yahooRange: '5y', periods: 60 },
};

function parseChartData(result: YahooChartResponse, timeframe: Timeframe): OHLCData[] {
  const chart = result.chart.result?.[0];
  if (!chart) return [];

  const { timestamp, indicators } = chart;
  const quote = indicators.quote[0];
  if (!timestamp || !quote) return [];

  const data: OHLCData[] = [];

  for (let i = 0; i < timestamp.length; i++) {
    if (quote.open[i] == null || quote.close[i] == null) continue;
    const date = new Date(timestamp[i] * 1000);
    data.push({
      time: date.toISOString().split('T')[0],
      open: Number(quote.open[i].toFixed(4)),
      high: Number(quote.high[i].toFixed(4)),
      low: Number(quote.low[i].toFixed(4)),
      close: Number(quote.close[i].toFixed(4)),
      volume: quote.volume[i] ?? 0,
    });
  }

  // For biweekly, aggregate weekly data into 2-week candles
  if (timeframe === 'biweekly') {
    return aggregateBiweekly(data);
  }

  return data;
}

function aggregateBiweekly(weeklyData: OHLCData[]): OHLCData[] {
  const result: OHLCData[] = [];
  for (let i = 0; i < weeklyData.length; i += 2) {
    const first = weeklyData[i];
    const second = weeklyData[i + 1];
    if (!second) {
      result.push(first);
      break;
    }
    result.push({
      time: first.time,
      open: first.open,
      high: Math.max(first.high, second.high),
      low: Math.min(first.low, second.low),
      close: second.close,
      volume: first.volume + second.volume,
    });
  }
  return result;
}

export const yahooFinance = {
  async getChart(ticker: string, timeframe: Timeframe): Promise<OHLCData[]> {
    const config = TIMEFRAME_CONFIGS[timeframe];
    // Trading 212 tickers may have suffixes like _EQ, _US_EQ etc. Strip them.
    const symbol = ticker.replace(/_[A-Z_]+$/, '');

    const params = new URLSearchParams({
      interval: config.yahooInterval,
      range: config.yahooRange,
    });

    const response = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`);

    if (!response.ok) {
      throw new Error(`Yahoo Finance error ${response.status} for ${symbol}`);
    }

    const data: YahooChartResponse = await response.json();

    if (data.chart.error) {
      throw new Error(`Yahoo Finance: ${data.chart.error.description}`);
    }

    return parseChartData(data, timeframe);
  },

  async getAllTimeframes(ticker: string): Promise<Record<Timeframe, OHLCData[]>> {
    const timeframes: Timeframe[] = ['daily', 'weekly', 'biweekly', 'monthly'];
    const results: Record<string, OHLCData[]> = {};

    // Fetch daily and weekly (biweekly derived from weekly)
    const [daily, weekly, monthly] = await Promise.all([
      yahooFinance.getChart(ticker, 'daily'),
      yahooFinance.getChart(ticker, 'weekly'),
      yahooFinance.getChart(ticker, 'monthly'),
    ]);

    results.daily = daily;
    results.weekly = weekly;
    results.biweekly = aggregateBiweekly(weekly);
    results.monthly = monthly;

    return results as Record<Timeframe, OHLCData[]>;
  },
};
```

**Step 3: Commit**

```bash
git add src/services/trading212.ts src/services/yahoo-finance.ts
git commit -m "feat: add Trading 212 and Yahoo Finance API clients"
```

---

### Task 5: Technical Analysis Library

**Files:**
- Create: `src/lib/indicators.ts`
- Create: `src/lib/trendlines.ts`
- Create: `src/lib/signals.ts`
- Create: `src/lib/utils.ts`

**Step 1: Implement utility functions**

File `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}
```

**Step 2: Implement technical indicators**

File `src/lib/indicators.ts`:
```ts
import type { OHLCData, SMAData, EMAData, RSIData, MACDData, BollingerData } from '@/types';

export function calcSMA(data: OHLCData[], period: number): SMAData[] {
  const result: SMAData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: Number((sum / period).toFixed(4)) });
  }
  return result;
}

export function calcEMA(data: OHLCData[], period: number): EMAData[] {
  const result: EMAData[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  result.push({ time: data[period - 1].time, value: Number(prevEma.toFixed(4)) });

  for (let i = period; i < data.length; i++) {
    const ema = (data[i].close - prevEma) * multiplier + prevEma;
    prevEma = ema;
    result.push({ time: data[i].time, value: Number(ema.toFixed(4)) });
  }

  return result;
}

export function calcRSI(data: OHLCData[], period = 14): RSIData[] {
  const result: RSIData[] = [];
  if (data.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: data[period].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });

  // Subsequent values using smoothed averages
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: data[i].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });
  }

  return result;
}

export function calcMACD(
  data: OHLCData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDData[] {
  const emaFast = calcEMA(data, fastPeriod);
  const emaSlow = calcEMA(data, slowPeriod);

  // Align fast and slow EMAs by time
  const slowStart = data.length - emaSlow.length;
  const fastOffset = slowStart - (data.length - emaFast.length);

  const macdLine: { time: string; value: number }[] = [];
  for (let i = 0; i < emaSlow.length; i++) {
    const fastValue = emaFast[i + fastOffset]?.value;
    const slowValue = emaSlow[i]?.value;
    if (fastValue != null && slowValue != null) {
      macdLine.push({
        time: emaSlow[i].time,
        value: Number((fastValue - slowValue).toFixed(4)),
      });
    }
  }

  // Calculate signal line (EMA of MACD)
  const result: MACDData[] = [];
  if (macdLine.length < signalPeriod) return result;

  const signalMultiplier = 2 / (signalPeriod + 1);
  let signalSum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    signalSum += macdLine[i].value;
  }
  let prevSignal = signalSum / signalPeriod;

  result.push({
    time: macdLine[signalPeriod - 1].time,
    macd: macdLine[signalPeriod - 1].value,
    signal: Number(prevSignal.toFixed(4)),
    histogram: Number((macdLine[signalPeriod - 1].value - prevSignal).toFixed(4)),
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    const signal = (macdLine[i].value - prevSignal) * signalMultiplier + prevSignal;
    prevSignal = signal;
    result.push({
      time: macdLine[i].time,
      macd: macdLine[i].value,
      signal: Number(signal.toFixed(4)),
      histogram: Number((macdLine[i].value - signal).toFixed(4)),
    });
  }

  return result;
}

export function calcBollingerBands(data: OHLCData[], period = 20, stdDev = 2): BollingerData[] {
  const result: BollingerData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const middle = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(data[i - j].close - middle, 2);
    }
    const std = Math.sqrt(variance / period);

    result.push({
      time: data[i].time,
      upper: Number((middle + stdDev * std).toFixed(4)),
      middle: Number(middle.toFixed(4)),
      lower: Number((middle - stdDev * std).toFixed(4)),
    });
  }

  return result;
}
```

**Step 3: Implement linear regression trendlines**

File `src/lib/trendlines.ts`:
```ts
import type { OHLCData, RegressionResult, RegressionLine } from '@/types';

export function calcLinearRegression(data: OHLCData[]): RegressionResult {
  const n = data.length;
  if (n < 2) {
    return { line: [], slope: 0, intercept: 0, rSquared: 0 };
  }

  // Use index as x, close price as y
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i].close;
    sumXY += i * data[i].close;
    sumX2 += i * i;
    sumY2 += data[i].close * data[i].close;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += Math.pow(data[i].close - predicted, 2);
    ssTot += Math.pow(data[i].close - meanY, 2);
  }
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  const line: RegressionLine[] = data.map((d, i) => ({
    time: d.time,
    value: Number((slope * i + intercept).toFixed(4)),
  }));

  return {
    line,
    slope: Number(slope.toFixed(6)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
  };
}
```

**Step 4: Implement signal scoring**

File `src/lib/signals.ts`:
```ts
import type {
  OHLCData,
  TechnicalIndicators,
  SignalDetail,
  SignalStrength,
  StockSignal,
} from '@/types';
import type { Timeframe } from '@/types/yahoo-finance';
import { calcSMA, calcEMA, calcRSI, calcMACD, calcBollingerBands } from './indicators';
import { calcLinearRegression } from './trendlines';

export function computeIndicators(data: OHLCData[]): TechnicalIndicators {
  return {
    sma20: calcSMA(data, 20),
    sma50: calcSMA(data, 50),
    ema12: calcEMA(data, 12),
    ema26: calcEMA(data, 26),
    rsi: calcRSI(data, 14),
    macd: calcMACD(data),
    bollinger: calcBollingerBands(data),
    regression: calcLinearRegression(data),
  };
}

function lastValue<T extends { value?: number }>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

function prevValue<T>(arr: T[]): T | undefined {
  return arr[arr.length - 2];
}

export function computeSignals(
  ticker: string,
  timeframe: Timeframe,
  data: OHLCData[],
  indicators: TechnicalIndicators
): StockSignal {
  const details: SignalDetail[] = [];

  // SMA Crossover
  const sma20Last = lastValue(indicators.sma20);
  const sma50Last = lastValue(indicators.sma50);
  if (sma20Last && sma50Last) {
    const cross = sma20Last.value > sma50Last.value ? 1 : -1;
    details.push({
      name: 'SMA Crossover (20/50)',
      value: cross,
      description: cross > 0
        ? `SMA-20 (${sma20Last.value.toFixed(2)}) above SMA-50 (${sma50Last.value.toFixed(2)}) - Bullish`
        : `SMA-20 (${sma20Last.value.toFixed(2)}) below SMA-50 (${sma50Last.value.toFixed(2)}) - Bearish`,
    });
  }

  // EMA Crossover
  const ema12Last = lastValue(indicators.ema12);
  const ema26Last = lastValue(indicators.ema26);
  if (ema12Last && ema26Last) {
    const cross = ema12Last.value > ema26Last.value ? 1 : -1;
    details.push({
      name: 'EMA Crossover (12/26)',
      value: cross,
      description: cross > 0
        ? `EMA-12 (${ema12Last.value.toFixed(2)}) above EMA-26 (${ema26Last.value.toFixed(2)}) - Bullish`
        : `EMA-12 (${ema12Last.value.toFixed(2)}) below EMA-26 (${ema26Last.value.toFixed(2)}) - Bearish`,
    });
  }

  // RSI
  const rsiLast = lastValue(indicators.rsi);
  if (rsiLast) {
    let rsiSignal = 0;
    let desc = '';
    if (rsiLast.value < 30) {
      rsiSignal = 1;
      desc = `RSI at ${rsiLast.value.toFixed(1)} - Oversold (Buy signal)`;
    } else if (rsiLast.value > 70) {
      rsiSignal = -1;
      desc = `RSI at ${rsiLast.value.toFixed(1)} - Overbought (Sell signal)`;
    } else {
      rsiSignal = 0;
      desc = `RSI at ${rsiLast.value.toFixed(1)} - Neutral`;
    }
    details.push({ name: 'RSI (14)', value: rsiSignal, description: desc });
  }

  // MACD
  const macdLast = indicators.macd[indicators.macd.length - 1];
  if (macdLast) {
    const cross = macdLast.macd > macdLast.signal ? 1 : -1;
    details.push({
      name: 'MACD',
      value: cross,
      description: cross > 0
        ? `MACD (${macdLast.macd.toFixed(4)}) above Signal (${macdLast.signal.toFixed(4)}) - Bullish`
        : `MACD (${macdLast.macd.toFixed(4)}) below Signal (${macdLast.signal.toFixed(4)}) - Bearish`,
    });
  }

  // Bollinger Bands
  const bbLast = indicators.bollinger[indicators.bollinger.length - 1];
  const lastPrice = data[data.length - 1]?.close;
  if (bbLast && lastPrice) {
    const bbRange = bbLast.upper - bbLast.lower;
    const position = (lastPrice - bbLast.lower) / bbRange; // 0 = at lower, 1 = at upper
    let bbSignal = 0;
    let desc = '';
    if (position <= 0.1) {
      bbSignal = 1;
      desc = `Price near lower Bollinger Band (${bbLast.lower.toFixed(2)}) - Potential bounce`;
    } else if (position >= 0.9) {
      bbSignal = -1;
      desc = `Price near upper Bollinger Band (${bbLast.upper.toFixed(2)}) - Potential pullback`;
    } else {
      bbSignal = 0;
      desc = `Price within Bollinger Bands - Neutral`;
    }
    details.push({ name: 'Bollinger Bands', value: bbSignal, description: desc });
  }

  // Linear Regression Slope
  const { slope, rSquared } = indicators.regression;
  if (slope !== 0) {
    const regSignal = slope > 0 ? 1 : -1;
    details.push({
      name: 'Trend (Regression)',
      value: regSignal,
      description: `Slope: ${slope > 0 ? '+' : ''}${slope.toFixed(4)}, R²: ${rSquared.toFixed(2)} - ${slope > 0 ? 'Uptrend' : 'Downtrend'}`,
    });
  }

  // Composite score
  const activeSignals = details.filter((d) => d.value !== 0);
  const score =
    activeSignals.length > 0
      ? Math.round((activeSignals.reduce((sum, d) => sum + d.value, 0) / details.length) * 100)
      : 0;

  return {
    ticker,
    timeframe,
    score,
    strength: scoreToStrength(score),
    details,
  };
}

export function scoreToStrength(score: number): SignalStrength {
  if (score >= 50) return 'strong-buy';
  if (score >= 20) return 'buy';
  if (score <= -50) return 'strong-sell';
  if (score <= -20) return 'sell';
  return 'hold';
}

export function compositeScore(signals: StockSignal[]): { score: number; strength: SignalStrength } {
  if (signals.length === 0) return { score: 0, strength: 'hold' };
  const avg = Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length);
  return { score: avg, strength: scoreToStrength(avg) };
}
```

**Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: add technical analysis library - indicators, trendlines, and signal scoring"
```

---

### Task 6: Custom React Hooks

**Files:**
- Create: `src/hooks/use-trading212.ts`
- Create: `src/hooks/use-price-data.ts`
- Create: `src/hooks/use-polling.ts`
- Create: `src/hooks/use-theme.ts`

**Step 1: Implement Trading 212 hook**

File `src/hooks/use-trading212.ts`:
```ts
import { useState, useEffect, useCallback } from 'react';
import type { T212Position, T212Cash } from '@/types';
import { trading212 } from '@/services/trading212';
import { storage } from '@/services/storage';

interface UseTrading212Result {
  positions: T212Position[];
  cash: T212Cash | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
}

export function useTrading212(): UseTrading212Result {
  const [positions, setPositions] = useState<T212Position[]>([]);
  const [cash, setCash] = useState<T212Cash | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const refresh = useCallback(async () => {
    const creds = storage.getCredentials();
    if (!creds) {
      setIsConnected(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [positionsData, cashData] = await Promise.all([
        trading212.getPositions(),
        trading212.getAccountCash(),
      ]);

      setPositions(positionsData);
      setCash(cashData);
      setIsConnected(true);

      storage.setPositions(positionsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      setIsConnected(false);

      // Try to load cached data
      const cached = storage.getPositions<T212Position[]>();
      if (cached) {
        setPositions(cached.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { positions, cash, isLoading, error, isConnected, refresh };
}
```

**Step 2: Implement price data hook**

File `src/hooks/use-price-data.ts`:
```ts
import { useState, useEffect, useCallback } from 'react';
import type { OHLCData, TechnicalIndicators, StockSignal, Timeframe } from '@/types';
import { yahooFinance } from '@/services/yahoo-finance';
import { storage } from '@/services/storage';
import { computeIndicators, computeSignals, compositeScore } from '@/lib/signals';
import type { SignalStrength } from '@/types';

interface UsePriceDataResult {
  ohlcByTimeframe: Record<string, OHLCData[]>;
  indicatorsByTimeframe: Record<string, TechnicalIndicators>;
  signals: StockSignal[];
  compositeSignal: SignalStrength;
  compositeScoreValue: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PRICE_CACHE_MAX_AGE = 60 * 60 * 1000; // 1 hour

export function usePriceData(ticker: string | null): UsePriceDataResult {
  const [ohlcByTimeframe, setOhlcByTimeframe] = useState<Record<string, OHLCData[]>>({});
  const [indicatorsByTimeframe, setIndicatorsByTimeframe] = useState<Record<string, TechnicalIndicators>>({});
  const [signals, setSignals] = useState<StockSignal[]>([]);
  const [compositeSignal, setCompositeSignal] = useState<SignalStrength>('hold');
  const [compositeScoreValue, setCompositeScoreValue] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ticker) return;

    // Check cache first
    const cached = storage.getPriceData(ticker);
    if (cached && storage.isCacheValid(cached.timestamp, PRICE_CACHE_MAX_AGE)) {
      processData(ticker, cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allData = await yahooFinance.getAllTimeframes(ticker);
      storage.setPriceData(ticker, allData);
      processData(ticker, allData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch price data';
      setError(message);

      // Fall back to cache even if stale
      if (cached) {
        processData(ticker, cached.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [ticker]);

  function processData(ticker: string, data: Record<string, OHLCData[]>) {
    setOhlcByTimeframe(data);

    const indicators: Record<string, TechnicalIndicators> = {};
    const sigs: StockSignal[] = [];

    for (const [tf, ohlc] of Object.entries(data)) {
      if (ohlc.length > 0) {
        indicators[tf] = computeIndicators(ohlc);
        sigs.push(computeSignals(ticker, tf as Timeframe, ohlc, indicators[tf]));
      }
    }

    setIndicatorsByTimeframe(indicators);
    setSignals(sigs);

    const composite = compositeScore(sigs);
    setCompositeSignal(composite.strength);
    setCompositeScoreValue(composite.score);
  }

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ohlcByTimeframe,
    indicatorsByTimeframe,
    signals,
    compositeSignal,
    compositeScoreValue,
    isLoading,
    error,
    refresh,
  };
}
```

**Step 3: Implement polling hook**

File `src/hooks/use-polling.ts`:
```ts
import { useEffect, useRef } from 'react';
import { storage } from '@/services/storage';

export function usePolling(callback: () => Promise<void>, intervalKey: 'pollingIntervalPositions' | 'pollingIntervalPrices') {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const prefs = storage.getPreferences();
    const intervalMs = prefs[intervalKey] * 1000;

    function tick() {
      if (document.visibilityState === 'visible') {
        savedCallback.current();
      }
    }

    intervalRef.current = setInterval(tick, intervalMs);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        savedCallback.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [intervalKey]);
}
```

**Step 4: Implement theme hook**

File `src/hooks/use-theme.ts`:
```ts
import { useState, useEffect } from 'react';
import { storage } from '@/services/storage';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => storage.getPreferences().theme);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);

    root.classList.toggle('dark', isDark);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    storage.setPreferences({ theme: t });
  };

  return { theme, setTheme };
}
```

**Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add custom hooks for T212 data, price data, polling, and theme"
```

---

### Task 7: Layout & Routing

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/layout.tsx`
- Create: `src/pages/dashboard.tsx`
- Create: `src/pages/portfolio.tsx`
- Create: `src/pages/stock-detail.tsx`
- Create: `src/pages/settings.tsx`
- Modify: `src/App.tsx`

**Step 1: Create Layout components**

File `src/components/layout/sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Settings, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">T212 Dashboard</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
```

File `src/components/layout/header.tsx`:
```tsx
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Header({ isConnected, isLoading, onRefresh }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div />
      <div className="flex items-center gap-3">
        <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>
    </header>
  );
}

import { cn } from '@/lib/utils';
```

File `src/components/layout/layout.tsx`:
```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useTrading212 } from '@/hooks/use-trading212';
import { usePolling } from '@/hooks/use-polling';
import { createContext, useContext } from 'react';
import type { T212Position, T212Cash } from '@/types';

interface AppContextType {
  positions: T212Position[];
  cash: T212Cash | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  refresh: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
  positions: [],
  cash: null,
  isLoading: false,
  error: null,
  isConnected: false,
  refresh: async () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

export function Layout() {
  const t212 = useTrading212();

  usePolling(t212.refresh, 'pollingIntervalPositions');

  return (
    <AppContext.Provider value={t212}>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header
            isConnected={t212.isConnected}
            isLoading={t212.isLoading}
            onRefresh={t212.refresh}
          />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
```

**Step 2: Create placeholder pages**

File `src/pages/dashboard.tsx`:
```tsx
export default function DashboardPage() {
  return <div>Dashboard - will be implemented</div>;
}
```

File `src/pages/portfolio.tsx`:
```tsx
export default function PortfolioPage() {
  return <div>Portfolio - will be implemented</div>;
}
```

File `src/pages/stock-detail.tsx`:
```tsx
export default function StockDetailPage() {
  return <div>Stock Detail - will be implemented</div>;
}
```

File `src/pages/settings.tsx`:
```tsx
export default function SettingsPage() {
  return <div>Settings - will be implemented</div>;
}
```

**Step 3: Update App.tsx with routing**

File `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/layout';
import DashboardPage from '@/pages/dashboard';
import PortfolioPage from '@/pages/portfolio';
import StockDetailPage from '@/pages/stock-detail';
import SettingsPage from '@/pages/settings';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/hooks/use-theme';

function AppInner() {
  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="stock/:ticker" element={<StockDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default function App() {
  return <AppInner />;
}
```

**Step 4: Verify app compiles and routes work**

Run: `npm run dev`

**Step 5: Commit**

```bash
git add src/components/layout/ src/pages/ src/App.tsx
git commit -m "feat: add layout, sidebar navigation, and routing"
```

---

### Task 8: Settings Page

**Files:**
- Modify: `src/pages/settings.tsx`

**Step 1: Implement Settings page**

File `src/pages/settings.tsx`:
```tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { storage } from '@/services/storage';
import { trading212 } from '@/services/trading212';
import { useAppContext } from '@/components/layout/layout';
import { CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsPage() {
  const { refresh } = useAppContext();
  const { theme, setTheme } = useTheme();

  const [apiKey, setApiKey] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error'>('untested');

  const prefs = storage.getPreferences();
  const [posInterval, setPosInterval] = useState(prefs.pollingIntervalPositions);
  const [priceInterval, setPriceInterval] = useState(prefs.pollingIntervalPrices);

  useEffect(() => {
    const creds = storage.getCredentials();
    if (creds) {
      setApiKey(creds.apiKey);
      setIsDemo(creds.isDemo);
      setConnectionStatus('success');
    }
  }, []);

  const handleSaveCredentials = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    storage.setCredentials({ apiKey: apiKey.trim(), isDemo });
    setTesting(true);
    setConnectionStatus('untested');

    const success = await trading212.testConnection();
    setConnectionStatus(success ? 'success' : 'error');
    setTesting(false);

    if (success) {
      toast.success('Connected to Trading 212');
      refresh();
    } else {
      toast.error('Failed to connect. Check your API key.');
    }
  };

  const handleSavePreferences = () => {
    storage.setPreferences({
      pollingIntervalPositions: posInterval,
      pollingIntervalPrices: priceInterval,
    });
    toast.success('Preferences saved');
  };

  const handleClearData = () => {
    storage.clearAll();
    setApiKey('');
    setConnectionStatus('untested');
    toast.success('All data cleared');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Trading 212 API</CardTitle>
          <CardDescription>
            Enter your API key from Trading 212 (Settings &gt; API)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Trading 212 API key"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="demo" checked={isDemo} onCheckedChange={setIsDemo} />
            <Label htmlFor="demo">Demo account</Label>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveCredentials} disabled={testing}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & Test Connection
            </Button>
            {connectionStatus === 'success' && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" /> Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" /> Failed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Polling</CardTitle>
          <CardDescription>Configure how often data is refreshed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Position refresh: {posInterval}s</Label>
            <Slider
              value={[posInterval]}
              onValueChange={([v]) => setPosInterval(v)}
              min={15}
              max={300}
              step={5}
            />
          </div>
          <div className="space-y-2">
            <Label>Price data refresh: {priceInterval}s</Label>
            <Slider
              value={[priceInterval]}
              onValueChange={([v]) => setPriceInterval(v)}
              min={60}
              max={900}
              step={30}
            />
          </div>
          <Button onClick={handleSavePreferences}>Save Preferences</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}>
              <SelectTrigger className="w-48">
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

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Clear all cached data and credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleClearData}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/settings.tsx
git commit -m "feat: implement Settings page with API config, polling, theme, and data management"
```

---

### Task 9: Dashboard Page

**Files:**
- Modify: `src/pages/dashboard.tsx`
- Create: `src/components/dashboard/account-summary.tsx`
- Create: `src/components/dashboard/signal-overview.tsx`
- Create: `src/components/dashboard/top-movers.tsx`
- Create: `src/components/common/signal-badge.tsx`

**Step 1: Create SignalBadge component**

File `src/components/common/signal-badge.tsx`:
```tsx
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
```

**Step 2: Create AccountSummary component**

File `src/components/dashboard/account-summary.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { T212Cash, T212Position } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface AccountSummaryProps {
  cash: T212Cash | null;
  positions: T212Position[];
  isLoading: boolean;
}

export function AccountSummary({ cash, positions, isLoading }: AccountSummaryProps) {
  const totalInvested = positions.reduce((sum, p) => sum + p.averagePrice * p.quantity, 0);
  const totalCurrent = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const totalPnL = positions.reduce((sum, p) => sum + p.ppl, 0);
  const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  const cards = [
    {
      title: 'Portfolio Value',
      value: formatCurrency(totalCurrent + (cash?.free ?? 0)),
      icon: DollarSign,
    },
    {
      title: 'Available Cash',
      value: cash ? formatCurrency(cash.free) : '-',
      icon: Wallet,
    },
    {
      title: 'Total P&L',
      value: formatCurrency(totalPnL),
      subtitle: formatPercent(pnlPercent),
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      valueClass: totalPnL >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Positions',
      value: String(positions.length),
      icon: TrendingUp,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.valueClass ?? ''}`}>{card.value}</div>
            {card.subtitle && (
              <p className={`text-xs ${card.valueClass ?? 'text-muted-foreground'}`}>
                {card.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Create SignalOverview component**

File `src/components/dashboard/signal-overview.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SignalStrength } from '@/types';
import { cn } from '@/lib/utils';

interface SignalOverviewProps {
  signals: Record<SignalStrength, number>;
}

const signalColors: Record<SignalStrength, string> = {
  'strong-buy': 'bg-green-600',
  'buy': 'bg-green-400',
  'hold': 'bg-yellow-400',
  'sell': 'bg-red-400',
  'strong-sell': 'bg-red-600',
};

const signalLabels: Record<SignalStrength, string> = {
  'strong-buy': 'Strong Buy',
  'buy': 'Buy',
  'hold': 'Hold',
  'sell': 'Sell',
  'strong-sell': 'Strong Sell',
};

export function SignalOverview({ signals }: SignalOverviewProps) {
  const total = Object.values(signals).reduce((sum, n) => sum + n, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Signal Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No signals yet. Connect your account and wait for data.</p>
        ) : (
          <div className="space-y-3">
            {(Object.entries(signalLabels) as [SignalStrength, string][]).map(([key, label]) => (
              <div key={key} className="flex items-center gap-3">
                <div className={cn('h-3 w-3 rounded-full', signalColors[key])} />
                <span className="w-24 text-sm">{label}</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all', signalColors[key])}
                      style={{ width: `${total > 0 ? (signals[key] / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="w-8 text-right text-sm font-medium">{signals[key]}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create TopMovers component**

File `src/components/dashboard/top-movers.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { T212Position } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TopMoversProps {
  positions: T212Position[];
}

export function TopMovers({ positions }: TopMoversProps) {
  const navigate = useNavigate();
  const sorted = [...positions].sort((a, b) => {
    const aPct = a.averagePrice > 0 ? (a.ppl / (a.averagePrice * a.quantity)) * 100 : 0;
    const bPct = b.averagePrice > 0 ? (b.ppl / (b.averagePrice * b.quantity)) * 100 : 0;
    return bPct - aPct;
  });

  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  function renderList(items: T212Position[], label: string) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data</p>
          ) : (
            items.map((p) => {
              const pct = p.averagePrice > 0 ? (p.ppl / (p.averagePrice * p.quantity)) * 100 : 0;
              return (
                <div
                  key={p.ticker}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
                  onClick={() => navigate(`/stock/${encodeURIComponent(p.ticker)}`)}
                >
                  <span className="text-sm font-medium">{p.ticker}</span>
                  <div className="text-right">
                    <span className={cn('text-sm font-medium', pct >= 0 ? 'text-green-600' : 'text-red-600')}>
                      {formatPercent(pct)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatCurrency(p.ppl)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {renderList(gainers, 'Top Gainers')}
      {renderList(losers, 'Top Losers')}
    </div>
  );
}
```

**Step 5: Assemble Dashboard page**

File `src/pages/dashboard.tsx`:
```tsx
import { useAppContext } from '@/components/layout/layout';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { SignalOverview } from '@/components/dashboard/signal-overview';
import { TopMovers } from '@/components/dashboard/top-movers';
import { usePriceData } from '@/hooks/use-price-data';
import type { SignalStrength } from '@/types';
import { useEffect, useState } from 'react';
import { compositeScore } from '@/lib/signals';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { positions, cash, isLoading, error, isConnected } = useAppContext();
  const [signalCounts, setSignalCounts] = useState<Record<SignalStrength, number>>({
    'strong-buy': 0, buy: 0, hold: 0, sell: 0, 'strong-sell': 0,
  });

  // This is a simplified overview - real signal computation happens per-stock
  // For the dashboard we'll show aggregated data from cached signals
  useEffect(() => {
    const cached = localStorage.getItem('signals_cache');
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        if (data) setSignalCounts(data);
      } catch {}
    }
  }, [positions]);

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Settings className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Connect Your Account</h2>
        <p className="text-muted-foreground">
          Go to <Link to="/settings" className="text-primary underline">Settings</Link> to enter your Trading 212 API key.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AccountSummary cash={cash} positions={positions} isLoading={isLoading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SignalOverview signals={signalCounts} />
        </div>
        <div className="lg:col-span-2">
          <TopMovers positions={positions} />
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add src/components/dashboard/ src/components/common/ src/pages/dashboard.tsx
git commit -m "feat: implement Dashboard page with account summary, signals, and top movers"
```

---

### Task 10: Portfolio Page

**Files:**
- Modify: `src/pages/portfolio.tsx`

**Step 1: Implement Portfolio page**

File `src/pages/portfolio.tsx`:
```tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SignalBadge } from '@/components/common/signal-badge';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { Search, ArrowUpDown } from 'lucide-react';
import type { T212Position, SignalStrength } from '@/types';
import { usePriceData } from '@/hooks/use-price-data';
import { compositeScore, computeIndicators, computeSignals } from '@/lib/signals';
import { yahooFinance } from '@/services/yahoo-finance';
import { storage } from '@/services/storage';
import type { Timeframe } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

type SortKey = 'ticker' | 'value' | 'pnl' | 'pnlPct' | 'signal';

interface PositionWithSignal extends T212Position {
  signal: SignalStrength;
  signalScore: number;
  pnlPct: number;
  totalValue: number;
}

export default function PortfolioPage() {
  const { positions, isLoading, isConnected } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [signalFilter, setSignalFilter] = useState<string>('all');
  const [positionsWithSignals, setPositionsWithSignals] = useState<PositionWithSignal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);

  // Compute signals for all positions
  useEffect(() => {
    if (positions.length === 0) return;

    async function computeAll() {
      setLoadingSignals(true);
      const results: PositionWithSignal[] = [];
      const signalCounts: Record<SignalStrength, number> = {
        'strong-buy': 0, buy: 0, hold: 0, sell: 0, 'strong-sell': 0,
      };

      for (const pos of positions) {
        try {
          const cached = storage.getPriceData(pos.ticker);
          let ohlcData = cached?.data;

          if (!ohlcData || !storage.isCacheValid(cached!.timestamp, 3600000)) {
            ohlcData = await yahooFinance.getAllTimeframes(pos.ticker);
            storage.setPriceData(pos.ticker, ohlcData);
          }

          const signals = Object.entries(ohlcData)
            .filter(([_, data]) => data.length > 0)
            .map(([tf, data]) => {
              const indicators = computeIndicators(data);
              return computeSignals(pos.ticker, tf as Timeframe, data, indicators);
            });

          const composite = compositeScore(signals);
          signalCounts[composite.strength]++;

          results.push({
            ...pos,
            signal: composite.strength,
            signalScore: composite.score,
            pnlPct: pos.averagePrice > 0 ? (pos.ppl / (pos.averagePrice * pos.quantity)) * 100 : 0,
            totalValue: pos.currentPrice * pos.quantity,
          });
        } catch {
          results.push({
            ...pos,
            signal: 'hold',
            signalScore: 0,
            pnlPct: pos.averagePrice > 0 ? (pos.ppl / (pos.averagePrice * pos.quantity)) * 100 : 0,
            totalValue: pos.currentPrice * pos.quantity,
          });
        }
      }

      setPositionsWithSignals(results);
      storage.setSignals(signalCounts);
      setLoadingSignals(false);
    }

    computeAll();
  }, [positions]);

  const filtered = useMemo(() => {
    let result = positionsWithSignals;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.ticker.toLowerCase().includes(q));
    }

    if (signalFilter !== 'all') {
      result = result.filter((p) => p.signal === signalFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'ticker': cmp = a.ticker.localeCompare(b.ticker); break;
        case 'value': cmp = a.totalValue - b.totalValue; break;
        case 'pnl': cmp = a.ppl - b.ppl; break;
        case 'pnlPct': cmp = a.pnlPct - b.pnlPct; break;
        case 'signal': cmp = a.signalScore - b.signalScore; break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [positionsWithSignals, search, signalFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Settings className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Connect Your Account</h2>
        <p className="text-muted-foreground">
          Go to <Link to="/settings" className="text-primary underline">Settings</Link> to enter your Trading 212 API key.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Portfolio</h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search stocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={signalFilter} onValueChange={setSignalFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter signals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Signals</SelectItem>
            <SelectItem value="strong-buy">Strong Buy</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="hold">Hold</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
            <SelectItem value="strong-sell">Strong Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  {([
                    ['ticker', 'Ticker'],
                    ['value', 'Value'],
                    ['pnl', 'P&L'],
                    ['pnlPct', 'P&L %'],
                    ['signal', 'Signal'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      className="cursor-pointer px-4 py-3 font-medium hover:text-foreground"
                      onClick={() => toggleSort(key)}
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {isLoading || loadingSignals ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {positions.length === 0 ? 'No positions found' : 'No matching stocks'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr
                      key={p.ticker}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/stock/${encodeURIComponent(p.ticker)}`)}
                    >
                      <td className="px-4 py-3 font-medium">{p.ticker}</td>
                      <td className="px-4 py-3">{formatCurrency(p.totalValue)}</td>
                      <td className={cn('px-4 py-3', p.ppl >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatCurrency(p.ppl)}
                      </td>
                      <td className={cn('px-4 py-3', p.pnlPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                        {formatPercent(p.pnlPct)}
                      </td>
                      <td className="px-4 py-3">
                        <SignalBadge strength={p.signal} score={p.signalScore} />
                      </td>
                      <td className="px-4 py-3">{p.quantity}</td>
                      <td className="px-4 py-3">{formatCurrency(p.averagePrice)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/pages/portfolio.tsx
git commit -m "feat: implement Portfolio page with sortable table, filters, and signal badges"
```

---

### Task 11: Stock Detail Page - Candlestick Chart

**Files:**
- Modify: `src/pages/stock-detail.tsx`
- Create: `src/components/stock/candlestick-chart.tsx`
- Create: `src/components/stock/indicator-panels.tsx`
- Create: `src/components/stock/signal-breakdown.tsx`

**Step 1: Create CandlestickChart component**

File `src/components/stock/candlestick-chart.tsx`:
```tsx
import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import type { OHLCData, TechnicalIndicators } from '@/types';

interface CandlestickChartProps {
  data: OHLCData[];
  indicators: TechnicalIndicators | null;
  showSMA: boolean;
  showEMA: boolean;
  showBollinger: boolean;
  showRegression: boolean;
  height?: number;
}

export function CandlestickChart({
  data,
  indicators,
  showSMA,
  showEMA,
  showBollinger,
  showRegression,
  height = 450,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = document.documentElement.classList.contains('dark');

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#e5e7eb' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: isDark ? '#374151' : '#d1d5db' },
      timeScale: { borderColor: isDark ? '#374151' : '#d1d5db' },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candleSeries.setData(data.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })));

    // Volume
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(data.map((d) => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    })));

    // Overlays
    if (indicators) {
      if (showSMA) {
        const sma20Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, title: 'SMA 20' });
        sma20Series.setData(indicators.sma20.map((d) => ({ time: d.time, value: d.value })));

        const sma50Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'SMA 50' });
        sma50Series.setData(indicators.sma50.map((d) => ({ time: d.time, value: d.value })));
      }

      if (showEMA) {
        const ema12Series = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, title: 'EMA 12' });
        ema12Series.setData(indicators.ema12.map((d) => ({ time: d.time, value: d.value })));

        const ema26Series = chart.addLineSeries({ color: '#ec4899', lineWidth: 1, title: 'EMA 26' });
        ema26Series.setData(indicators.ema26.map((d) => ({ time: d.time, value: d.value })));
      }

      if (showBollinger && indicators.bollinger.length > 0) {
        const bbUpper = chart.addLineSeries({
          color: 'rgba(156,163,175,0.6)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Upper',
        });
        bbUpper.setData(indicators.bollinger.map((d) => ({ time: d.time, value: d.upper })));

        const bbMiddle = chart.addLineSeries({
          color: 'rgba(156,163,175,0.4)', lineWidth: 1, title: 'BB Middle',
        });
        bbMiddle.setData(indicators.bollinger.map((d) => ({ time: d.time, value: d.middle })));

        const bbLower = chart.addLineSeries({
          color: 'rgba(156,163,175,0.6)', lineWidth: 1, lineStyle: LineStyle.Dashed, title: 'BB Lower',
        });
        bbLower.setData(indicators.bollinger.map((d) => ({ time: d.time, value: d.lower })));
      }

      if (showRegression && indicators.regression.line.length > 0) {
        const regSeries = chart.addLineSeries({
          color: '#f97316', lineWidth: 2, lineStyle: LineStyle.Dotted, title: 'Regression',
        });
        regSeries.setData(indicators.regression.line.map((d) => ({ time: d.time, value: d.value })));
      }
    }

    chart.timeScale().fitContent();

    // Resize handler
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, indicators, showSMA, showEMA, showBollinger, showRegression, height]);

  return <div ref={containerRef} className="w-full" />;
}
```

**Step 2: Create IndicatorPanels component**

File `src/components/stock/indicator-panels.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi } from 'lightweight-charts';
import type { TechnicalIndicators } from '@/types';

interface IndicatorPanelsProps {
  indicators: TechnicalIndicators | null;
}

export function RSIPanel({ indicators }: IndicatorPanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !indicators || indicators.rsi.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#e5e7eb' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
      },
      rightPriceScale: { borderColor: isDark ? '#374151' : '#d1d5db' },
      timeScale: { borderColor: isDark ? '#374151' : '#d1d5db', visible: false },
    });

    const rsiSeries = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 2, title: 'RSI' });
    rsiSeries.setData(indicators.rsi.map((d) => ({ time: d.time, value: d.value })));

    // Overbought/oversold lines
    rsiSeries.createPriceLine({ price: 70, color: 'rgba(239,68,68,0.5)', lineWidth: 1, axisLabelVisible: true, title: '' });
    rsiSeries.createPriceLine({ price: 30, color: 'rgba(34,197,94,0.5)', lineWidth: 1, axisLabelVisible: true, title: '' });

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); };
  }, [indicators]);

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">RSI (14)</h3>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

export function MACDPanel({ indicators }: IndicatorPanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !indicators || indicators.macd.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDark ? '#e5e7eb' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
        horzLines: { color: isDark ? '#1f2937' : '#f3f4f6' },
      },
      rightPriceScale: { borderColor: isDark ? '#374151' : '#d1d5db' },
      timeScale: { borderColor: isDark ? '#374151' : '#d1d5db', visible: false },
    });

    const macdSeries = chart.addLineSeries({ color: '#3b82f6', lineWidth: 2, title: 'MACD' });
    macdSeries.setData(indicators.macd.map((d) => ({ time: d.time, value: d.macd })));

    const signalSeries = chart.addLineSeries({ color: '#ef4444', lineWidth: 1, title: 'Signal' });
    signalSeries.setData(indicators.macd.map((d) => ({ time: d.time, value: d.signal })));

    const histSeries = chart.addHistogramSeries({ title: 'Histogram' });
    histSeries.setData(indicators.macd.map((d) => ({
      time: d.time,
      value: d.histogram,
      color: d.histogram >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
    })));

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) chart.applyOptions({ width: entry.contentRect.width });
    });
    observer.observe(containerRef.current);

    return () => { observer.disconnect(); chart.remove(); };
  }, [indicators]);

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium text-muted-foreground">MACD</h3>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
```

**Step 3: Create SignalBreakdown component**

File `src/components/stock/signal-breakdown.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StockSignal } from '@/types';
import { SignalBadge } from '@/components/common/signal-badge';
import { cn } from '@/lib/utils';

interface SignalBreakdownProps {
  signals: StockSignal[];
}

export function SignalBreakdown({ signals }: SignalBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Signal Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.timeframe} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{signal.timeframe}</span>
              <SignalBadge strength={signal.strength} score={signal.score} />
            </div>
            <div className="space-y-1">
              {signal.details.map((detail) => (
                <div key={detail.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{detail.name}</span>
                  <span className={cn(
                    detail.value > 0 ? 'text-green-600' : detail.value < 0 ? 'text-red-600' : 'text-yellow-600'
                  )}>
                    {detail.value > 0 ? 'Bullish' : detail.value < 0 ? 'Bearish' : 'Neutral'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

**Step 4: Assemble Stock Detail page**

File `src/pages/stock-detail.tsx`:
```tsx
import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { usePriceData } from '@/hooks/use-price-data';
import { useAppContext } from '@/components/layout/layout';
import { CandlestickChart } from '@/components/stock/candlestick-chart';
import { RSIPanel, MACDPanel } from '@/components/stock/indicator-panels';
import { SignalBreakdown } from '@/components/stock/signal-breakdown';
import { SignalBadge } from '@/components/common/signal-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import type { Timeframe } from '@/types';

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const decodedTicker = ticker ? decodeURIComponent(ticker) : null;
  const { positions } = useAppContext();
  const {
    ohlcByTimeframe,
    indicatorsByTimeframe,
    signals,
    compositeSignal,
    compositeScoreValue,
    isLoading,
    error,
  } = usePriceData(decodedTicker);

  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showBollinger, setShowBollinger] = useState(true);
  const [showRegression, setShowRegression] = useState(true);

  const position = positions.find((p) => p.ticker === decodedTicker);
  const currentData = ohlcByTimeframe[timeframe] ?? [];
  const currentIndicators = indicatorsByTimeframe[timeframe] ?? null;

  if (!decodedTicker) {
    return <div className="py-10 text-center text-muted-foreground">No ticker specified</div>;
  }

  const pnlPct = position && position.averagePrice > 0
    ? (position.ppl / (position.averagePrice * position.quantity)) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/portfolio" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{decodedTicker}</h1>
          {!isLoading && (
            <SignalBadge strength={compositeSignal} score={compositeScoreValue} />
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Position info */}
      {position && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Current Price</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-lg font-bold">{formatCurrency(position.currentPrice)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Avg Price</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-lg font-bold">{formatCurrency(position.averagePrice)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">Quantity</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-lg font-bold">{position.quantity}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={cn('text-lg font-bold', position.ppl >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatCurrency(position.ppl)}
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">P&L %</CardTitle>
            </CardHeader>
            <CardContent>
              <span className={cn('text-lg font-bold', pnlPct >= 0 ? 'text-green-600' : 'text-red-600')}>
                {formatPercent(pnlPct)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="sma" checked={showSMA} onCheckedChange={setShowSMA} />
          <Label htmlFor="sma" className="text-xs">SMA</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ema" checked={showEMA} onCheckedChange={setShowEMA} />
          <Label htmlFor="ema" className="text-xs">EMA</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="bb" checked={showBollinger} onCheckedChange={setShowBollinger} />
          <Label htmlFor="bb" className="text-xs">Bollinger</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="reg" checked={showRegression} onCheckedChange={setShowRegression} />
          <Label htmlFor="reg" className="text-xs">Regression</Label>
        </div>
      </div>

      {/* Timeframe tabs with chart */}
      <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="biweekly">Biweekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        {(['daily', 'weekly', 'biweekly', 'monthly'] as Timeframe[]).map((tf) => (
          <TabsContent key={tf} value={tf}>
            {isLoading ? (
              <Skeleton className="h-[450px] w-full" />
            ) : (
              <Card>
                <CardContent className="p-2">
                  <CandlestickChart
                    data={ohlcByTimeframe[tf] ?? []}
                    indicators={indicatorsByTimeframe[tf] ?? null}
                    showSMA={showSMA}
                    showEMA={showEMA}
                    showBollinger={showBollinger}
                    showRegression={showRegression}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* RSI and MACD panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-2">
            <RSIPanel indicators={currentIndicators} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2">
            <MACDPanel indicators={currentIndicators} />
          </CardContent>
        </Card>
      </div>

      {/* Signal breakdown */}
      {signals.length > 0 && (
        <SignalBreakdown signals={signals} />
      )}

      {/* Regression stats */}
      {currentIndicators?.regression && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Regression Analysis ({timeframe})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <span className="text-xs text-muted-foreground">Slope</span>
                <p className={cn(
                  'text-lg font-bold',
                  currentIndicators.regression.slope > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {currentIndicators.regression.slope > 0 ? '+' : ''}
                  {currentIndicators.regression.slope.toFixed(4)}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">R² (Fit Quality)</span>
                <p className="text-lg font-bold">{currentIndicators.regression.rSquared.toFixed(4)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Trend</span>
                <p className={cn(
                  'text-lg font-bold',
                  currentIndicators.regression.slope > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {currentIndicators.regression.slope > 0 ? 'Uptrend' : 'Downtrend'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add src/components/stock/ src/pages/stock-detail.tsx
git commit -m "feat: implement Stock Detail page with candlestick chart, indicators, and signals"
```

---

### Task 12: Demo Mode Proxy & Final Integration

**Files:**
- Modify: `vite.config.ts` (add demo proxy)
- Modify: `src/main.tsx` (ensure proper entry point)

**Step 1: Add demo proxy to vite config**

Add to the proxy section of `vite.config.ts`:
```ts
'/api/t212-demo': {
  target: 'https://demo.trading212.com/api/v0',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/t212-demo/, ''),
  headers: { 'Origin': 'https://demo.trading212.com' },
},
```

**Step 2: Update main.tsx**

File `src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Step 3: Verify full app compiles and runs**

Run: `npm run dev`
Check: All pages render, navigation works, settings page saves data.

**Step 4: Run build to verify no TypeScript errors**

Run: `npm run build`
Expected: Clean build with no errors

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add demo proxy, finalize integration, verify build"
```
