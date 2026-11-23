import { describe, it, expect } from 'vitest';
import type { ReconstructionResult } from '@/types';
import { buildComparison } from './benchmark-comparison';

// Account: deposit 1000 on day 1, deposit 500 on day 3; benchmark flat at 100
// then +10% on day 4.
const RECON: ReconstructionResult = {
  points: [
    { date: '2024-01-01', value: 1000, netDeposited: 1000 },
    { date: '2024-01-02', value: 1050, netDeposited: 1000 },
    { date: '2024-01-03', value: 1550, netDeposited: 1500 },
    { date: '2024-01-04', value: 1600, netDeposited: 1500 },
  ],
  externalFlows: [
    { date: '2024-01-01', amount: 1000 },
    { date: '2024-01-03', amount: 500 },
  ],
  unpricedTickers: [],
  holdingsToday: {},
  valueToday: 1600,
};
const PRICES = { '2024-01-01': 100, '2024-01-02': 100, '2024-01-03': 100, '2024-01-04': 110 };

describe('buildComparison', () => {
  it('ALL seeds from zero and follows every flow', () => {
    const c = buildComparison(RECON, PRICES, '2024-01-01');
    expect(c.data.map((p) => p.benchmark)).toEqual([1000, 1000, 1500, 1650]);
    expect(c.data.map((p) => p.netDeposited)).toEqual([1000, 1000, 1500, 1500]);
    expect(c).toMatchObject({ myValue: 1600, benchmarkValue: 1650, deposited: 1500, shortfall: null });
  });

  it('a later range seeds with the value going into its first day, without double-counting that day', () => {
    const c = buildComparison(RECON, PRICES, '2024-01-03');
    // seed = 1050 (close of 01-02), plus the 500 deposited on 01-03
    expect(c.data.map((p) => p.date)).toEqual(['2024-01-03', '2024-01-04']);
    expect(c.data[0].benchmark).toBeCloseTo(1550);
    expect(c.data[1].benchmark).toBeCloseTo(1705);
    expect(c.data.map((p) => p.netDeposited)).toEqual([1550, 1550]);
    expect(c.deposited).toBe(500);
  });

  it('flags benchmark history that starts well after the range start', () => {
    const late = { '2024-02-01': 100 };
    expect(buildComparison(RECON, late, '2024-01-01').benchmarkStartsOn).toBe('2024-02-01');
    expect(buildComparison(RECON, PRICES, '2024-01-01').benchmarkStartsOn).toBeNull();
  });

  it('throws without benchmark prices', () => {
    expect(() => buildComparison(RECON, {}, '2024-01-01')).toThrow('No benchmark prices');
  });
});
