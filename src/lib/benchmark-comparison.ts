import type { BenchmarkResult, ISODate, ReconstructionResult } from '@/types';
import { simulateBenchmark } from './benchmark-simulation';
import { addDays } from './dates';

export interface ComparisonPoint {
  date: ISODate;
  account: number;
  benchmark: number;
  netDeposited: number;
}

export interface Comparison {
  data: ComparisonPoint[];
  myValue: number;
  benchmarkValue: number;
  /** Net external flows inside the range. */
  deposited: number;
  shortfall: BenchmarkResult['shortfall'];
  /** First benchmark price date, when it is well after the range start. */
  benchmarkStartsOn: ISODate | null;
}

/** Benchmark history starting this many days after the range start is flagged. */
const LATE_BENCHMARK_DAYS = 7;

/**
 * Restarts the comparison at `start` (a date within the reconstruction): the
 * benchmark account is seeded with the real account value going into that day
 * (the previous day's close, so flows on `start` are not counted twice; 0 at
 * the start of history), then only external flows inside the range flow into
 * it. "Net deposited" starts from the same seed.
 *
 * Throws `No benchmark prices` when `benchmarkPrices` is empty.
 */
export function buildComparison(
  reconstruction: ReconstructionResult,
  benchmarkPrices: Record<ISODate, number>,
  start: ISODate,
): Comparison {
  const { points, externalFlows } = reconstruction;
  const today = points[points.length - 1].date;
  const startIdx = Math.max(0, points.findIndex((p) => p.date >= start));
  const before = startIdx > 0 ? points[startIdx - 1] : null;
  const seed = before?.value ?? 0;
  const depositedBefore = before?.netDeposited ?? 0;
  const startDate = points[startIdx].date;

  const sim = simulateBenchmark({
    flows: externalFlows,
    prices: benchmarkPrices,
    startDate,
    endDate: today,
    seedValue: seed,
  });
  const benchByDate = new Map(sim.points.map((p) => [p.date, p.value]));

  const data: ComparisonPoint[] = points.slice(startIdx).map((p) => ({
    date: p.date,
    account: p.value,
    benchmark: benchByDate.get(p.date) ?? 0,
    netDeposited: seed + p.netDeposited - depositedBefore,
  }));

  const firstPriceDate = Object.keys(benchmarkPrices).reduce((a, b) => (b < a ? b : a));
  const last = data[data.length - 1];
  return {
    data,
    myValue: last.account,
    benchmarkValue: last.benchmark,
    deposited: last.netDeposited - seed,
    shortfall: sim.shortfall,
    benchmarkStartsOn: firstPriceDate > addDays(startDate, LATE_BENCHMARK_DAYS) ? firstPriceDate : null,
  };
}
