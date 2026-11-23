import { describe, it, expect } from 'vitest';
import { normalizeOrders, normalizeTransactions, normalizeDividends } from './history-normalize';
import type { T212OrderHistoryItem, T212TransactionItem } from '@/types';

function order(o: { side?: 'BUY' | 'SELL'; qty?: number; netValue?: number; filledAt?: string; walletCurrency?: string }): T212OrderHistoryItem {
  return {
    order: {
      id: 1, ticker: 'AAPL_US_EQ', side: o.side ?? 'BUY', status: 'FILLED', currency: 'USD',
      createdAt: '2024-03-04T14:30:00Z',
      instrument: { ticker: 'AAPL_US_EQ', currency: 'USD', isin: 'US0378331005', name: 'Apple' },
    },
    fill: {
      id: 1, filledAt: o.filledAt ?? '2024-03-04T14:31:00Z', price: 50, quantity: o.qty ?? 1, type: 'TRADE',
      walletImpact: { currency: o.walletCurrency ?? 'EUR', fxRate: 1, netValue: o.netValue ?? 50, realisedProfitLoss: 0, taxes: [] },
    },
  };
}

function tx(type: T212TransactionItem['type'], amount: number): T212TransactionItem {
  return { amount, currency: 'EUR', dateTime: '2024-01-02T10:00:00Z', reference: `${type}-${amount}`, type };
}

describe('history normalization', () => {
  it('orders: BUY gives +qty and negative cash regardless of netValue sign', () => {
    const [f] = normalizeOrders([order({ side: 'BUY', qty: 2, netValue: 101.5, filledAt: '2024-03-04T14:31:00Z' })]);
    expect(f).toMatchObject({ id: 'fill-1', date: '2024-03-04', ticker: 'AAPL_US_EQ', quantity: 2, cashImpact: -101.5, fillType: 'TRADE' });
  });
  it('orders: cash impact currency comes from walletImpact', () => {
    expect(normalizeOrders([order({ walletCurrency: 'GBP' })])[0].currency).toBe('GBP');
  });
  it('orders: falls back to order currency when walletImpact has none', () => {
    const item = order({});
    const fill = item.fill!;
    const noCcy = { ...item, fill: { ...fill, walletImpact: { ...fill.walletImpact, currency: undefined as unknown as string } } };
    expect(normalizeOrders([noCcy])[0].currency).toBe('USD');
  });
  it('orders: SELL gives -qty and positive cash even if netValue is negative', () => {
    const [f] = normalizeOrders([order({ side: 'SELL', qty: 2, netValue: -120 })]);
    expect(f.quantity).toBe(-2);
    expect(f.cashImpact).toBe(120);
  });
  it('orders: items without a fill are skipped', () => {
    expect(normalizeOrders([{ ...order({}), fill: undefined }])).toEqual([]);
  });
  it('transactions: signs come from type', () => {
    const out = normalizeTransactions([
      tx('DEPOSIT', -500), tx('WITHDRAW', 200), tx('FEE', 3), tx('INTEREST_ON_FREE_CASH', -1.2), tx('TRANSFER', -50),
    ]);
    expect(out.map((c) => [c.kind, c.amount, c.external])).toEqual([
      ['deposit', 500, true], ['withdrawal', -200, true], ['fee', -3, false], ['interest', 1.2, false], ['transfer', -50, true],
    ]);
  });
  it('transactions: both interest types are positive internal interest', () => {
    const out = normalizeTransactions([tx('INTEREST_ON_FREE_CASH', -1.2), tx('LENDING_INTEREST', -0.4)]);
    expect(out.map((c) => [c.kind, c.amount, c.external])).toEqual([['interest', 1.2, false], ['interest', 0.4, false]]);
  });
  it('transactions: unknown types keep their raw sign as internal "other"', () => {
    const unknown = (amount: number) => tx('CASHBACK' as T212TransactionItem['type'], amount);
    const out = normalizeTransactions([unknown(-7), unknown(3)]);
    expect(out.map((c) => [c.kind, c.amount, c.external])).toEqual([['other', -7, false], ['other', 3, false]]);
  });
  it('dividends: positive internal cash flow dated paidOn', () => {
    const [d] = normalizeDividends([{ amount: 4.2, currency: 'EUR', paidOn: '2024-05-10T00:00:00Z', reference: 'r1', ticker: 'X', quantity: 1, type: 'ORDINARY' }]);
    expect(d).toMatchObject({ id: 'div-r1', date: '2024-05-10', kind: 'dividend', amount: 4.2, currency: 'EUR', external: false });
  });
});
