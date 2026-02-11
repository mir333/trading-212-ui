import type { OHLCData, RegressionResult } from '@/types';

/**
 * Calculates a linear regression over closing prices.
 * Uses array index as X and close price as Y.
 */
export function calcLinearRegression(data: OHLCData[]): RegressionResult {
  if (data.length < 2) {
    return {
      line: data.map((d) => ({ time: d.time, value: d.close })),
      slope: 0,
      intercept: data.length === 1 ? data[0].close : 0,
      rSquared: 0,
    };
  }

  const n = data.length;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i].close;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const meanY = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (data[i].close - predicted) ** 2;
    ssTot += (data[i].close - meanY) ** 2;
  }
  const rSquared = ssTot === 0 ? 0 : Number((1 - ssRes / ssTot).toFixed(4));

  const line = data.map((d, i) => ({
    time: d.time,
    value: Number((slope * i + intercept).toFixed(4)),
  }));

  return {
    line,
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    rSquared,
  };
}
