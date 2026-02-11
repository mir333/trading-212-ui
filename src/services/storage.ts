import type {
  T212Credentials,
  T212Position,
  T212Instrument,
  OHLCData,
  Timeframe,
  StockSignal,
} from '@/types';

// ---------------------------------------------------------------------------
// Generic cache wrapper
// ---------------------------------------------------------------------------

export interface CachedData<T> {
  data: T;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  pollingIntervalPositions: number; // seconds
  pollingIntervalPrices: number; // seconds
  theme: 'light' | 'dark' | 'system';
  enabledTimeframes: Timeframe[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  pollingIntervalPositions: 60,
  pollingIntervalPrices: 300,
  theme: 'system',
  enabledTimeframes: ['daily', 'weekly', 'biweekly', 'monthly'],
};

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEYS = {
  CREDENTIALS: 't212_credentials',
  POSITIONS: 't212_positions',
  INSTRUMENTS: 't212_instruments',
  PREFERENCES: 't212_preferences',
  SIGNALS: 't212_signals',
  PRICE_PREFIX: 't212_price_',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function isCacheValid(timestamp: number, maxAgeMs: number): boolean {
  return Date.now() - timestamp < maxAgeMs;
}

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export function getCredentials(): T212Credentials | null {
  return readJSON<T212Credentials>(KEYS.CREDENTIALS);
}

export function setCredentials(credentials: T212Credentials): void {
  writeJSON(KEYS.CREDENTIALS, credentials);
}

export function clearCredentials(): void {
  localStorage.removeItem(KEYS.CREDENTIALS);
}

// ---------------------------------------------------------------------------
// Positions (cached)
// ---------------------------------------------------------------------------

export function getPositions(): CachedData<T212Position[]> | null {
  return readJSON<CachedData<T212Position[]>>(KEYS.POSITIONS);
}

export function setPositions(positions: T212Position[]): void {
  const cached: CachedData<T212Position[]> = {
    data: positions,
    timestamp: Date.now(),
  };
  writeJSON(KEYS.POSITIONS, cached);
}

// ---------------------------------------------------------------------------
// Instruments (cached)
// ---------------------------------------------------------------------------

export function getInstruments(): CachedData<T212Instrument[]> | null {
  return readJSON<CachedData<T212Instrument[]>>(KEYS.INSTRUMENTS);
}

export function setInstruments(instruments: T212Instrument[]): void {
  const cached: CachedData<T212Instrument[]> = {
    data: instruments,
    timestamp: Date.now(),
  };
  writeJSON(KEYS.INSTRUMENTS, cached);
}

// ---------------------------------------------------------------------------
// Price data per ticker (cached)
// ---------------------------------------------------------------------------

export function getPriceData(
  ticker: string,
): CachedData<Record<string, OHLCData[]>> | null {
  return readJSON<CachedData<Record<string, OHLCData[]>>>(
    KEYS.PRICE_PREFIX + ticker,
  );
}

export function setPriceData(
  ticker: string,
  data: Record<string, OHLCData[]>,
): void {
  const cached: CachedData<Record<string, OHLCData[]>> = {
    data,
    timestamp: Date.now(),
  };
  writeJSON(KEYS.PRICE_PREFIX + ticker, cached);
}

// ---------------------------------------------------------------------------
// Signals (cached)
// ---------------------------------------------------------------------------

export function getSignals(): CachedData<StockSignal[]> | null {
  return readJSON<CachedData<StockSignal[]>>(KEYS.SIGNALS);
}

export function setSignals(signals: StockSignal[]): void {
  const cached: CachedData<StockSignal[]> = {
    data: signals,
    timestamp: Date.now(),
  };
  writeJSON(KEYS.SIGNALS, cached);
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export function getPreferences(): UserPreferences {
  const stored = readJSON<UserPreferences>(KEYS.PREFERENCES);
  if (stored === null) return { ...DEFAULT_PREFERENCES };
  // Merge with defaults so newly-added keys are always present
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export function setPreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  writeJSON(KEYS.PREFERENCES, { ...current, ...prefs });
}

// ---------------------------------------------------------------------------
// Clear everything
// ---------------------------------------------------------------------------

export function clearAll(): void {
  // Remove known keys
  localStorage.removeItem(KEYS.CREDENTIALS);
  localStorage.removeItem(KEYS.POSITIONS);
  localStorage.removeItem(KEYS.INSTRUMENTS);
  localStorage.removeItem(KEYS.PREFERENCES);
  localStorage.removeItem(KEYS.SIGNALS);

  // Remove all per-ticker price entries
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key !== null && key.startsWith(KEYS.PRICE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
