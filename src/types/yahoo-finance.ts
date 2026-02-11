export interface YahooChartResult {
  meta: {
    currency: string;
    symbol: string;
    exchangeName: string;
    instrumentType: string;
    regularMarketPrice: number;
    previousClose: number;
  };
  timestamp: number[];
  indicators: {
    quote: Array<{
      open: number[];
      high: number[];
      low: number[];
      close: number[];
      volume: number[];
    }>;
    adjclose?: Array<{
      adjclose: number[];
    }>;
  };
}

export interface YahooChartResponse {
  chart: {
    result: YahooChartResult[];
    error: null | { code: string; description: string };
  };
}

export interface OHLCData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface TimeframeConfig {
  label: string;
  yahooInterval: string;
  yahooRange: string;
  periods: number;
}
