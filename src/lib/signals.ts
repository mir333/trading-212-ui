import type {
  OHLCData,
  TechnicalIndicators,
  StockSignal,
  SignalStrength,
  SignalDetail,
} from '@/types';
import { calcSMA, calcEMA, calcRSI, calcMACD, calcBollingerBands } from './indicators';
import { calcLinearRegression } from './trendlines';

// ---------------------------------------------------------------------------
// Compute all indicators for a dataset
// ---------------------------------------------------------------------------

export function computeIndicators(data: OHLCData[]): TechnicalIndicators {
  return {
    sma20: calcSMA(data, 20),
    sma50: calcSMA(data, 50),
    ema12: calcEMA(data, 12),
    ema26: calcEMA(data, 26),
    rsi: calcRSI(data),
    macd: calcMACD(data),
    bollinger: calcBollingerBands(data),
    regression: calcLinearRegression(data),
  };
}

// ---------------------------------------------------------------------------
// Compute signals for a single ticker + timeframe
// ---------------------------------------------------------------------------

export function computeSignals(
  ticker: string,
  timeframe: string,
  data: OHLCData[],
  indicators: TechnicalIndicators,
): StockSignal {
  const details: SignalDetail[] = [];

  // 1. SMA crossover (20/50)
  const lastSma20 = indicators.sma20[indicators.sma20.length - 1];
  const lastSma50 = indicators.sma50[indicators.sma50.length - 1];
  if (lastSma20 && lastSma50) {
    const smaSignal = lastSma20.value > lastSma50.value ? 1 : -1;
    details.push({
      name: 'SMA Crossover (20/50)',
      value: smaSignal,
      description:
        smaSignal === 1
          ? 'SMA20 is above SMA50 (bullish)'
          : 'SMA20 is below SMA50 (bearish)',
    });
  }

  // 2. EMA crossover (12/26)
  const lastEma12 = indicators.ema12[indicators.ema12.length - 1];
  const lastEma26 = indicators.ema26[indicators.ema26.length - 1];
  if (lastEma12 && lastEma26) {
    const emaSignal = lastEma12.value > lastEma26.value ? 1 : -1;
    details.push({
      name: 'EMA Crossover (12/26)',
      value: emaSignal,
      description:
        emaSignal === 1
          ? 'EMA12 is above EMA26 (bullish)'
          : 'EMA12 is below EMA26 (bearish)',
    });
  }

  // 3. RSI
  const lastRsi = indicators.rsi[indicators.rsi.length - 1];
  if (lastRsi) {
    let rsiSignal: number;
    let rsiDesc: string;
    if (lastRsi.value < 30) {
      rsiSignal = 1;
      rsiDesc = `RSI at ${lastRsi.value.toFixed(1)} (oversold)`;
    } else if (lastRsi.value > 70) {
      rsiSignal = -1;
      rsiDesc = `RSI at ${lastRsi.value.toFixed(1)} (overbought)`;
    } else {
      rsiSignal = 0;
      rsiDesc = `RSI at ${lastRsi.value.toFixed(1)} (neutral)`;
    }
    details.push({ name: 'RSI', value: rsiSignal, description: rsiDesc });
  }

  // 4. MACD
  const lastMacd = indicators.macd[indicators.macd.length - 1];
  if (lastMacd) {
    const macdSignal = lastMacd.macd > lastMacd.signal ? 1 : -1;
    details.push({
      name: 'MACD',
      value: macdSignal,
      description:
        macdSignal === 1
          ? 'MACD above signal line (bullish)'
          : 'MACD below signal line (bearish)',
    });
  }

  // 5. Bollinger Bands
  const lastBollinger = indicators.bollinger[indicators.bollinger.length - 1];
  if (lastBollinger && data.length > 0) {
    const lastClose = data[data.length - 1].close;
    const bandWidth = lastBollinger.upper - lastBollinger.lower;
    const lowerThreshold = lastBollinger.lower + bandWidth * 0.1;
    const upperThreshold = lastBollinger.upper - bandWidth * 0.1;

    let bbSignal: number;
    let bbDesc: string;
    if (lastClose <= lowerThreshold) {
      bbSignal = 1;
      bbDesc = 'Price near lower Bollinger Band (oversold)';
    } else if (lastClose >= upperThreshold) {
      bbSignal = -1;
      bbDesc = 'Price near upper Bollinger Band (overbought)';
    } else {
      bbSignal = 0;
      bbDesc = 'Price within Bollinger Bands (neutral)';
    }
    details.push({
      name: 'Bollinger Bands',
      value: bbSignal,
      description: bbDesc,
    });
  }

  // 6. Regression slope
  const { slope } = indicators.regression;
  const regSignal = slope > 0 ? 1 : slope < 0 ? -1 : 0;
  details.push({
    name: 'Trend (Regression)',
    value: regSignal,
    description:
      regSignal === 1
        ? `Upward trend (slope: ${slope})`
        : regSignal === -1
          ? `Downward trend (slope: ${slope})`
          : 'Flat trend',
  });

  const score = calculateScore(details);

  return {
    ticker,
    timeframe,
    score,
    strength: scoreToStrength(score),
    details,
  };
}

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------

function calculateScore(details: SignalDetail[]): number {
  if (details.length === 0) return 0;
  const nonZero = details.filter((d) => d.value !== 0);
  if (nonZero.length === 0) return 0;
  const sum = nonZero.reduce((acc, d) => acc + d.value, 0);
  return Math.round((sum / details.length) * 100);
}

export function scoreToStrength(score: number): SignalStrength {
  if (score >= 50) return 'strong-buy';
  if (score >= 20) return 'buy';
  if (score <= -50) return 'strong-sell';
  if (score <= -20) return 'sell';
  return 'hold';
}

// ---------------------------------------------------------------------------
// Composite across multiple timeframes
// ---------------------------------------------------------------------------

export function compositeScore(
  signals: StockSignal[],
): { score: number; strength: SignalStrength } {
  if (signals.length === 0) return { score: 0, strength: 'hold' };
  const avg = Math.round(
    signals.reduce((acc, s) => acc + s.score, 0) / signals.length,
  );
  return { score: avg, strength: scoreToStrength(avg) };
}
