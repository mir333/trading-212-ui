import type {
  OHLCData,
  SMAData,
  EMAData,
  RSIData,
  MACDData,
  BollingerData,
} from '@/types';

// ---------------------------------------------------------------------------
// Simple Moving Average
// ---------------------------------------------------------------------------

export function calcSMA(data: OHLCData[], period: number): SMAData[] {
  const result: SMAData[] = [];
  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({
      time: data[i].time,
      value: Number((sum / period).toFixed(4)),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Exponential Moving Average
// ---------------------------------------------------------------------------

export function calcEMA(data: OHLCData[], period: number): EMAData[] {
  const result: EMAData[] = [];
  if (data.length < period) return result;

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({
    time: data[period - 1].time,
    value: Number(ema.toFixed(4)),
  });

  const multiplier = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({
      time: data[i].time,
      value: Number(ema.toFixed(4)),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Relative Strength Index (Wilder's smoothing)
// ---------------------------------------------------------------------------

export function calcRSI(data: OHLCData[], period = 14): RSIData[] {
  const result: RSIData[] = [];
  if (data.length < period + 1) return result;

  // Calculate initial average gain/loss over `period`
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  const rsi =
    avgLoss === 0 ? 100 : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(4));
  result.push({ time: data[period].time, value: rsi });

  // Wilder's smoothing for subsequent values
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const val =
      avgLoss === 0
        ? 100
        : Number((100 - 100 / (1 + avgGain / avgLoss)).toFixed(4));
    result.push({ time: data[i].time, value: val });
  }
  return result;
}

// ---------------------------------------------------------------------------
// MACD
// ---------------------------------------------------------------------------

export function calcMACD(
  data: OHLCData[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MACDData[] {
  const emaFast = calcEMA(data, fast);
  const emaSlow = calcEMA(data, slow);

  if (emaFast.length === 0 || emaSlow.length === 0) return [];

  // Align the two EMAs by time
  const slowTimeSet = new Set(emaSlow.map((e) => e.time));
  const alignedFast: EMAData[] = [];
  const alignedSlow: EMAData[] = [];
  for (const point of emaFast) {
    if (slowTimeSet.has(point.time)) {
      alignedFast.push(point);
      const slowPoint = emaSlow.find((s) => s.time === point.time);
      if (slowPoint) alignedSlow.push(slowPoint);
    }
  }

  if (alignedFast.length === 0) return [];

  // Build MACD line
  const macdLine: { time: string | number; value: number }[] = [];
  for (let i = 0; i < alignedFast.length; i++) {
    macdLine.push({
      time: alignedFast[i].time,
      value: Number((alignedFast[i].value - alignedSlow[i].value).toFixed(4)),
    });
  }

  // Calculate signal line as EMA of MACD values
  if (macdLine.length < signalPeriod) {
    return macdLine.map((m) => ({
      time: m.time,
      macd: m.value,
      signal: 0,
      histogram: Number(m.value.toFixed(4)),
    }));
  }

  // Seed signal EMA with SMA of first signalPeriod MACD values
  let signalSum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    signalSum += macdLine[i].value;
  }
  let signalEma = signalSum / signalPeriod;

  const result: MACDData[] = [];
  const multiplier = 2 / (signalPeriod + 1);

  for (let i = 0; i < macdLine.length; i++) {
    if (i < signalPeriod - 1) {
      // Not enough data for signal line yet
      result.push({
        time: macdLine[i].time,
        macd: macdLine[i].value,
        signal: 0,
        histogram: Number(macdLine[i].value.toFixed(4)),
      });
    } else if (i === signalPeriod - 1) {
      result.push({
        time: macdLine[i].time,
        macd: macdLine[i].value,
        signal: Number(signalEma.toFixed(4)),
        histogram: Number((macdLine[i].value - signalEma).toFixed(4)),
      });
    } else {
      signalEma =
        (macdLine[i].value - signalEma) * multiplier + signalEma;
      result.push({
        time: macdLine[i].time,
        macd: macdLine[i].value,
        signal: Number(signalEma.toFixed(4)),
        histogram: Number((macdLine[i].value - signalEma).toFixed(4)),
      });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Bollinger Bands
// ---------------------------------------------------------------------------

export function calcBollingerBands(
  data: OHLCData[],
  period = 20,
  stdDev = 2,
): BollingerData[] {
  const result: BollingerData[] = [];
  if (data.length < period) return result;

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += (data[j].close - mean) ** 2;
    }
    const std = Math.sqrt(varianceSum / period);

    result.push({
      time: data[i].time,
      upper: Number((mean + stdDev * std).toFixed(4)),
      middle: Number(mean.toFixed(4)),
      lower: Number((mean - stdDev * std).toFixed(4)),
    });
  }
  return result;
}
