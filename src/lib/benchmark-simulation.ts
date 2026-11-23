import type { BenchmarkPoint, BenchmarkResult, ExternalFlow, ISODate } from '@/types';
import { eachDay } from './dates';
import { priceOn } from './price-history';

export interface BenchmarkInput {
  flows: ExternalFlow[];
  /** adjclose already in account currency */
  prices: Record<ISODate, number>;
  startDate: ISODate;
  endDate: ISODate;
  seedValue: number;
}

export function simulateBenchmark(input: BenchmarkInput): BenchmarkResult {
  const { flows, prices, startDate, endDate, seedValue } = input;
  if (Object.keys(prices).length === 0) throw new Error('No benchmark prices');

  const flowsByDate = new Map<ISODate, number[]>();
  for (const f of flows) {
    if (f.date < startDate || f.date > endDate) continue;
    const list = flowsByDate.get(f.date);
    if (list) list.push(f.amount);
    else flowsByDate.set(f.date, [f.amount]);
  }

  let units = 0;
  let shortfall: BenchmarkResult['shortfall'] = null;
  const points: BenchmarkPoint[] = [];

  for (const date of eachDay(startDate, endDate)) {
    const price = priceOn(prices, date)!;
    if (date === startDate) units += seedValue / price;
    for (const amount of flowsByDate.get(date) ?? []) {
      if (amount >= 0) {
        units += amount / price;
        continue;
      }
      const sellUnits = -amount / price;
      if (sellUnits > units) {
        if (!shortfall) shortfall = { date, amount: -amount - units * price };
        units = 0;
      } else {
        units -= sellUnits;
      }
    }
    points.push({ date, value: units * price });
  }

  return { points, shortfall };
}
