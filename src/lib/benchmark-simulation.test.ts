import { describe, it, expect } from 'vitest';
import { simulateBenchmark } from './benchmark-simulation';

const P = { '2024-01-01': 100, '2024-01-02': 110, '2024-01-05': 120 }; // 03–04 weekend

describe('simulateBenchmark', () => {
  it('deposit buys units', () => {
    const r = simulateBenchmark({ flows: [{ date: '2024-01-01', amount: 1000 }], prices: P, startDate: '2024-01-01', endDate: '2024-01-02', seedValue: 0 });
    expect(r.points.map((p) => p.value)).toEqual([1000, 1100]);
  });
  it('weekend deposit uses last price', () => {
    const r = simulateBenchmark({ flows: [{ date: '2024-01-03', amount: 110 }], prices: P, startDate: '2024-01-01', endDate: '2024-01-05', seedValue: 0 });
    expect(r.points.at(-1)!.value).toBeCloseTo(120);
  });
  it('seeds at range start and ignores earlier flows', () => {
    const r = simulateBenchmark({ flows: [{ date: '2024-01-01', amount: 999 }], prices: P, startDate: '2024-01-02', endDate: '2024-01-05', seedValue: 1100 });
    expect(r.points[0]).toEqual({ date: '2024-01-02', value: 1100 });
    expect(r.points.at(-1)!.value).toBeCloseTo(1200);
  });
  it('oversized withdrawal clamps at zero and records shortfall', () => {
    const r = simulateBenchmark({ flows: [{ date: '2024-01-01', amount: 1000 }, { date: '2024-01-02', amount: -1500 }], prices: P, startDate: '2024-01-01', endDate: '2024-01-05', seedValue: 0 });
    expect(r.points.at(-1)!.value).toBe(0);
    expect(r.shortfall).toEqual({ date: '2024-01-02', amount: 400 });
  });
  it('flow before first available price buys at first price', () => {
    const r = simulateBenchmark({ flows: [{ date: '2023-12-29', amount: 100 }], prices: P, startDate: '2023-12-29', endDate: '2024-01-01', seedValue: 0 });
    expect(r.points.at(-1)!.value).toBeCloseTo(100);
  });
  it('throws when there are no prices', () => {
    expect(() => simulateBenchmark({ flows: [], prices: {}, startDate: '2024-01-01', endDate: '2024-01-02', seedValue: 0 })).toThrow('No benchmark prices');
  });
});
