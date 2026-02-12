import type {
  T212Position,
  T212Cash,
  T212Instrument,
  T212PaginatedResponse,
  T212HistoryItem,
} from '@/types';
import { getCredentials } from './storage';
import { ConnectionManager } from './connection-manager';

// ---------------------------------------------------------------------------
// Connection manager — serialises all T212 requests and enforces per-endpoint
// rate limits taken from the official API docs.
// ---------------------------------------------------------------------------

const t212Connection = new ConnectionManager({
  name: 'Trading 212',
  rules: [
    { pattern: '/equity/metadata/instruments', maxRequests: 1, periodMs: 50_000 },
    { pattern: '/equity/metadata/exchanges',   maxRequests: 1, periodMs: 30_000 },
    { pattern: '/equity/account',              maxRequests: 1, periodMs: 5_000 },
    { pattern: '/equity/history/orders',       maxRequests: 6, periodMs: 60_000 },
    { pattern: '/equity/history/dividends',    maxRequests: 6, periodMs: 60_000 },
    { pattern: '/equity/history/transactions', maxRequests: 6, periodMs: 60_000 },
    { pattern: '/equity/history/exports',      maxRequests: 1, periodMs: 60_000 },
    { pattern: '/equity/portfolio',            maxRequests: 1, periodMs: 1_000 },
    { pattern: '/equity/pies',                 maxRequests: 1, periodMs: 5_000 },
    { pattern: '/equity/orders',               maxRequests: 1, periodMs: 5_000 },
  ],
  maxRetries: 3,
  getRetryWaitMs(response, attempt) {
    // Prefer the server-provided reset time
    const resetHeader = response.headers.get('x-ratelimit-reset');
    if (resetHeader) {
      const resetTime = Number(resetHeader) * 1000;
      return Math.max(resetTime - Date.now() + 200, 1000);
    }
    // Fallback: exponential backoff 2s, 4s, 8s
    return 2000 * Math.pow(2, attempt);
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  const creds = getCredentials();
  if (creds?.isDemo) return '/api/t212-demo';
  return '/api/t212';
}

function getHeaders(): HeadersInit {
  const creds = getCredentials();
  if (!creds) throw new Error('No Trading 212 credentials configured');
  const encoded = btoa(`${creds.apiKey}:${creds.apiSecret}`);
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Core fetch — every call goes through the connection manager queue
// ---------------------------------------------------------------------------

async function fetchT212<T>(endpoint: string): Promise<T> {
  const response = await t212Connection.request(endpoint, () =>
    fetch(`${getBaseUrl()}${endpoint}`, { headers: getHeaders() }),
  );

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

// ---------------------------------------------------------------------------
// Instruments — loaded once and cached, fetched directly (bypasses the serial
// queue so it doesn't block behind operational calls like getPositions).
// ---------------------------------------------------------------------------

let instrumentsPromise: Promise<T212Instrument[]> | null = null;

function fetchInstrumentsDirect(): Promise<T212Instrument[]> {
  if (instrumentsPromise) return instrumentsPromise;

  instrumentsPromise = (async () => {
    const items: T212Instrument[] = [];
    let nextPath: string | null = '/equity/metadata/instruments';
    while (nextPath) {
      const response = await fetch(`${getBaseUrl()}${nextPath}`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Trading 212 API error ${response.status}: ${text}`);
      }
      const data: T212PaginatedResponse<T212Instrument> = await response.json();
      items.push(...data.items);
      nextPath = data.nextPagePath;
    }
    return items;
  })().finally(() => {
    instrumentsPromise = null;
  });

  return instrumentsPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const trading212 = {
  async getAccountCash(): Promise<T212Cash> {
    return fetchT212<T212Cash>('/equity/account/cash');
  },

  async getPositions(): Promise<T212Position[]> {
    return fetchT212<T212Position[]>('/equity/portfolio');
  },

  async getInstruments(): Promise<T212Instrument[]> {
    return fetchInstrumentsDirect();
  },

  async getOrderHistory(
    cursor?: string,
    limit = 50,
  ): Promise<T212PaginatedResponse<T212HistoryItem>> {
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
