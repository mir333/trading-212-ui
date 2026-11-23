import type {
  CashFlow,
  CashFlowKind,
  Fill,
  T212DividendItem,
  T212OrderHistoryItem,
  T212TransactionItem,
} from '@/types';

// T212 amount sign conventions are undocumented: derive signs from side/type
// and use Math.abs on the raw amount (TRANSFER keeps its raw sign).

export function normalizeOrders(items: T212OrderHistoryItem[]): Fill[] {
  const fills: Fill[] = [];
  for (const { order, fill } of items) {
    if (!fill) continue;
    const sign = order.side === 'BUY' ? 1 : -1;
    fills.push({
      id: `fill-${fill.id}`,
      date: fill.filledAt.slice(0, 10),
      ticker: order.ticker,
      quantity: sign * Math.abs(fill.quantity),
      cashImpact: -sign * Math.abs(fill.walletImpact.netValue),
      fillType: fill.type,
    });
  }
  return fills;
}

export function normalizeTransactions(items: T212TransactionItem[]): CashFlow[] {
  return items.map((item) => {
    const abs = Math.abs(item.amount);
    let kind: CashFlowKind;
    let amount: number;
    let external = false;
    switch (item.type) {
      case 'DEPOSIT':
        kind = 'deposit'; amount = abs; external = true; break;
      case 'WITHDRAW':
        kind = 'withdrawal'; amount = -abs; external = true; break;
      case 'TRANSFER':
        kind = 'transfer'; amount = item.amount; external = true; break;
      case 'FEE':
        kind = 'fee'; amount = -abs; break;
      case 'INTEREST_ON_FREE_CASH':
      case 'LENDING_INTEREST':
        kind = 'interest'; amount = abs; break;
      default:
        // Unknown type: no sign convention to derive, so keep the raw sign.
        kind = 'other'; amount = item.amount; break;
    }
    return {
      id: `tx-${item.reference}`,
      date: item.dateTime.slice(0, 10),
      kind,
      amount,
      currency: item.currency,
      external,
    };
  });
}

export function normalizeDividends(items: T212DividendItem[]): CashFlow[] {
  return items.map((item) => ({
    id: `div-${item.reference}`,
    date: item.paidOn.slice(0, 10),
    kind: 'dividend',
    amount: Math.abs(item.amount),
    currency: item.currency,
    external: false,
  }));
}
