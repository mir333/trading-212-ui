import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('./history-db', () => ({
  idbGet: vi.fn(async (key: string) => store.get(key)),
  idbSet: vi.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
}));
vi.mock('./trading212', () => ({
  trading212: { getHistoryPage: vi.fn(async () => ({ items: [], nextPagePath: null })) },
}));

const { HISTORY_KEY_VERSION, historyNamespace, syncHistory } = await import('./history-sync');

describe('history namespace', () => {
  it('is versioned and scoped by environment and account id', () => {
    expect(HISTORY_KEY_VERSION).toBe('v2');
    expect(historyNamespace(true, 42)).toBe('v2:demo:42');
    expect(historyNamespace(false, 42)).toBe('v2:live:42');
  });
});

describe('syncHistory storage keys', () => {
  beforeEach(() => store.clear());

  it('reads and writes only under the given namespace', async () => {
    const fill = { id: 'fill-1', date: '2024-01-01', ticker: 'X', quantity: 1, cashImpact: -1, currency: 'USD', fillType: 'TRADE' };
    store.set('v2:demo:1:events:fills', [fill]);
    store.set('events:fills', [{ ...fill, id: 'legacy' }]);

    const live = await syncHistory('v2:live:1', () => {});
    expect(live.fills).toEqual([]);
    expect(store.get('v2:live:1:events:fills')).toEqual([]);
    expect(store.get('v2:live:1:events:cashflows')).toEqual([]);

    const demo = await syncHistory('v2:demo:1', () => {});
    expect(demo.fills).toEqual([fill]);
  });
});
