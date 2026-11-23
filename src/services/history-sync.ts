import type {
  CashFlow,
  Fill,
  HistoryEvents,
  T212DividendItem,
  T212OrderHistoryItem,
  T212TransactionItem,
} from '@/types';
import { mergePage } from '@/lib/history-merge';
import { normalizeDividends, normalizeOrders, normalizeTransactions } from '@/lib/history-normalize';
import { trading212 } from './trading212';
import { idbGet, idbSet } from './history-db';

const FILLS_KEY = 'events:fills';
const CASHFLOWS_KEY = 'events:cashflows';

/**
 * Pages one endpoint newest-first until a known event or the last page.
 * Returns stored + fresh events. Nothing is persisted here, so a failure
 * mid-paging never leaves a gap behind a known id.
 */
async function syncEndpoint<R, E extends { id: string }>(
  endpoint: 'orders' | 'transactions' | 'dividends',
  stored: E[],
  normalize: (items: R[]) => E[],
  onProgress: (message: string) => void,
): Promise<E[]> {
  const known = new Set(stored.map((e) => e.id));
  const collected: E[] = [];
  const seen = new Set<string>();
  let nextPath: string | undefined;
  let page = 0;
  for (;;) {
    page += 1;
    onProgress(`Fetching ${endpoint}… page ${page}`);
    const res = await trading212.getHistoryPage<R>(endpoint, nextPath);
    const { fresh, reachedKnown } = mergePage(known, normalize(res.items), (e) => e.id);
    for (const e of fresh) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        collected.push(e);
      }
    }
    if (reachedKnown || !res.nextPagePath) break;
    nextPath = res.nextPagePath;
  }
  return [...collected, ...stored];
}

export async function syncHistory(onProgress: (message: string) => void): Promise<HistoryEvents> {
  const storedFills = (await idbGet<Fill[]>(FILLS_KEY)) ?? [];
  const storedFlows = (await idbGet<CashFlow[]>(CASHFLOWS_KEY)) ?? [];

  const fills = await syncEndpoint<T212OrderHistoryItem, Fill>('orders', storedFills, normalizeOrders, onProgress);
  await idbSet(FILLS_KEY, fills);

  const transactions = await syncEndpoint<T212TransactionItem, CashFlow>(
    'transactions',
    storedFlows.filter((c) => c.id.startsWith('tx-')),
    normalizeTransactions,
    onProgress,
  );
  const dividends = await syncEndpoint<T212DividendItem, CashFlow>(
    'dividends',
    storedFlows.filter((c) => c.id.startsWith('div-')),
    normalizeDividends,
    onProgress,
  );
  const cashFlows = [...transactions, ...dividends];
  await idbSet(CASHFLOWS_KEY, cashFlows);

  return { fills, cashFlows };
}
