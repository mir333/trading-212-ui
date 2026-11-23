import { describe, it, expect } from 'vitest';
import { eachDay, rangeStartDate } from './dates';

describe('eachDay', () => {
  it('is inclusive and handles leap day', () => {
    expect(eachDay('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });
});

describe('rangeStartDate', () => {
  it('subtracts a year', () => {
    expect(rangeStartDate('1Y', '2026-11-22', '2020-01-01')).toBe('2025-11-22');
  });
  it('subtracts months', () => {
    expect(rangeStartDate('3M', '2026-11-22', '2020-01-01')).toBe('2026-08-22');
    expect(rangeStartDate('1M', '2026-11-22', '2020-01-01')).toBe('2026-10-22');
  });
  it('YTD is Jan 1', () => {
    expect(rangeStartDate('YTD', '2026-11-22', '2020-01-01')).toBe('2026-01-01');
  });
  it('never earlier than firstDate', () => {
    expect(rangeStartDate('1Y', '2026-11-22', '2026-06-01')).toBe('2026-06-01');
  });
  it('ALL is firstDate', () => {
    expect(rangeStartDate('ALL', '2026-11-22', '2021-03-05')).toBe('2021-03-05');
  });
});
