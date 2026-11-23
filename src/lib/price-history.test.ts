import { describe, it, expect } from 'vitest';
import type { YahooChartResponse } from '@/types';
import { parseDailyHistory, priceOn, fxSymbol, toAccountCurrency } from './price-history';

const day = (iso: string) => Date.parse(`${iso}T14:30:00Z`) / 1000;

function yahoo(o: {
  currency: string;
  ts: number[];
  close: (number | null)[];
  adj?: (number | null)[];
  splits?: Record<string, { date: number; numerator: number; denominator: number }>;
}): YahooChartResponse {
  return {
    chart: {
      error: null,
      result: [
        {
          meta: { currency: o.currency, symbol: 'X', exchangeName: 'E', instrumentType: 'EQUITY', regularMarketPrice: 0, previousClose: 0 },
          timestamp: o.ts,
          indicators: {
            quote: [{ open: [], high: [], low: [], close: o.close as number[], volume: [] }],
            ...(o.adj ? { adjclose: [{ adjclose: o.adj as number[] }] } : {}),
          },
          ...(o.splits ? { events: { splits: o.splits } } : {}),
        },
      ],
    },
  };
}

describe('parseDailyHistory', () => {
  it('normalizes GBp to GBP', () => {
    const s = parseDailyHistory(yahoo({ currency: 'GBp', ts: [day('2024-01-02')], close: [8000], adj: [7900] }));
    expect(s.currency).toBe('GBP');
    expect(s.closes['2024-01-02']).toBe(80);
    expect(s.adjCloses['2024-01-02']).toBe(79);
  });
  it('normalizes GBX to GBP', () => {
    const s = parseDailyHistory(yahoo({ currency: 'GBX', ts: [day('2024-01-02')], close: [500] }));
    expect(s.currency).toBe('GBP');
    expect(s.closes['2024-01-02']).toBe(5);
  });
  it('skips null closes and reads splits', () => {
    const s = parseDailyHistory(
      yahoo({
        currency: 'USD',
        ts: [day('2024-01-02'), day('2024-01-03')],
        close: [10, null],
        adj: [10, null],
        splits: { x: { date: day('2024-06-10'), numerator: 4, denominator: 1 } },
      }),
    );
    expect(Object.keys(s.closes)).toEqual(['2024-01-02']);
    expect(s.splits).toEqual([{ date: '2024-06-10', ratio: 4 }]);
  });
  it('falls back to close when adjclose is missing', () => {
    const s = parseDailyHistory(yahoo({ currency: 'USD', ts: [day('2024-01-02')], close: [10] }));
    expect(s.adjCloses['2024-01-02']).toBe(10);
  });
});

describe('priceOn', () => {
  it('carries forward and back-fills before first point', () => {
    const p = { '2024-01-05': 10, '2024-01-08': 12 };
    expect(priceOn(p, '2024-01-07')).toBe(10);
    expect(priceOn(p, '2024-01-01')).toBe(10);
    expect(priceOn({}, '2024-01-01')).toBeNull();
  });
});

describe('fxSymbol', () => {
  it('builds the Yahoo pair symbol', () => {
    expect(fxSymbol('USD', 'EUR')).toBe('USDEUR=X');
  });
});

describe('toAccountCurrency', () => {
  it('multiplies by carried-forward fx', () => {
    expect(toAccountCurrency({ '2024-01-06': 100 }, { '2024-01-05': 1.2 })).toEqual({ '2024-01-06': 120 });
  });
  it('returns the series unchanged when fx is null', () => {
    expect(toAccountCurrency({ '2024-01-06': 100 }, null)).toEqual({ '2024-01-06': 100 });
  });
});
