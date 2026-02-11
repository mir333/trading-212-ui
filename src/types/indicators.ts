import type { OHLCData } from './yahoo-finance';

export interface SMAData {
  time: string;
  value: number;
}

export interface EMAData {
  time: string;
  value: number;
}

export interface RSIData {
  time: string;
  value: number;
}

export interface MACDData {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerData {
  time: string;
  upper: number;
  middle: number;
  lower: number;
}

export interface RegressionLine {
  time: string;
  value: number;
}

export interface RegressionResult {
  line: RegressionLine[];
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface TechnicalIndicators {
  sma20: SMAData[];
  sma50: SMAData[];
  ema12: EMAData[];
  ema26: EMAData[];
  rsi: RSIData[];
  macd: MACDData[];
  bollinger: BollingerData[];
  regression: RegressionResult;
}

export type SignalStrength = 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell';

export interface SignalDetail {
  name: string;
  value: number;
  description: string;
}

export interface StockSignal {
  ticker: string;
  timeframe: string;
  score: number;
  strength: SignalStrength;
  details: SignalDetail[];
}

export interface PortfolioStock {
  position: {
    ticker: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    ppl: number;
  };
  instrumentName: string;
  ohlc: Record<string, OHLCData[]>;
  indicators: Record<string, TechnicalIndicators>;
  signals: StockSignal[];
  compositeSignal: SignalStrength;
  compositeScore: number;
}
