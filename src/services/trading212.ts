import type {
  T212Position,
  T212Cash,
  T212Instrument,
  T212PaginatedResponse,
  T212HistoryItem,
} from '@/types';
import { getCredentials } from './storage';

function getBaseUrl(): string {
  const creds = getCredentials();
  if (creds?.isDemo) return '/api/t212-demo';
  return '/api/t212';
}

function getHeaders(): HeadersInit {
  const creds = getCredentials();
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
    return fetchT212<T212Position[]>('/equity/portfolio');
  },

  async getInstruments(): Promise<T212Instrument[]> {
    return fetchAllPages<T212Instrument>('/equity/metadata/instruments');
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
