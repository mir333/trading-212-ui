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

/**
 * Version prefix of stored history keys. Bump whenever normalization changes
 * so already-stored events are re-fetched instead of mixed with new ones.
 */
export const HISTORY_KEY_VERSION = 'v2';

/** Storage namespace for one T212 account: version, environment and account id. */
export function historyNamespace(isDemo: boolean, accountId: number): string {
  return `${HISTORY_KEY_VERSION}:${isDemo ? 'demo' : 'live'}:${accountId}`;
}

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

export async function syncHistory(
  namespace: string,
  onProgress: (message: string) => void,
): Promise<HistoryEvents> {
  const fillsKey = `${namespace}:events:fills`;
  const cashFlowsKey = `${namespace}:events:cashflows`;
  const storedFills = (await idbGet<Fill[]>(fillsKey)) ?? [];
  const storedFlows = (await idbGet<CashFlow[]>(cashFlowsKey)) ?? [];

  const fills = await syncEndpoint<T212OrderHistoryItem, Fill>('orders', storedFills, normalizeOrders, onProgress);
  await idbSet(fillsKey, fills);

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
  await idbSet(cashFlowsKey, cashFlows);

  return { fills, cashFlows };
}
