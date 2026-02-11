import type {
  YahooChartResponse,
  OHLCData,
  Timeframe,
  TimeframeConfig,
} from '@/types';

export const TIMEFRAME_CONFIGS: Record<Timeframe, TimeframeConfig> = {
  daily: {
    label: 'Daily',
    yahooInterval: '1d',
    yahooRange: '6mo',
    periods: 180,
  },
  weekly: {
    label: 'Weekly',
    yahooInterval: '1wk',
    yahooRange: '2y',
    periods: 104,
  },
  biweekly: {
    label: 'Biweekly',
    yahooInterval: '1wk',
    yahooRange: '2y',
    periods: 104,
  },
  monthly: {
    label: 'Monthly',
    yahooInterval: '1mo',
    yahooRange: '5y',
    periods: 60,
  },
};

function parseChartData(result: YahooChartResponse): OHLCData[] {
  const chart = result.chart.result?.[0];
  if (!chart) return [];

  const { timestamp, indicators } = chart;
  const quote = indicators.quote[0];
  if (!timestamp || !quote) return [];

  const data: OHLCData[] = [];
  for (let i = 0; i < timestamp.length; i++) {
    if (quote.open[i] == null || quote.close[i] == null) continue;
    const date = new Date(timestamp[i] * 1000);
    data.push({
      time: date.toISOString().split('T')[0],
      open: Number(quote.open[i].toFixed(4)),
      high: Number(quote.high[i].toFixed(4)),
      low: Number(quote.low[i].toFixed(4)),
      close: Number(quote.close[i].toFixed(4)),
      volume: quote.volume[i] ?? 0,
    });
  }
  return data;
}

function aggregateBiweekly(weeklyData: OHLCData[]): OHLCData[] {
  const result: OHLCData[] = [];
  for (let i = 0; i < weeklyData.length; i += 2) {
    const first = weeklyData[i];
    const second = weeklyData[i + 1];
    if (!second) {
      result.push(first);
      break;
    }
    result.push({
      time: first.time,
      open: first.open,
      high: Math.max(first.high, second.high),
      low: Math.min(first.low, second.low),
      close: second.close,
      volume: first.volume + second.volume,
    });
  }
  return result;
}

export const yahooFinance = {
  async getChart(ticker: string, timeframe: Timeframe): Promise<OHLCData[]> {
    const config = TIMEFRAME_CONFIGS[timeframe];
    const symbol = ticker.replace(/_[A-Z_]+$/, '');
    const params = new URLSearchParams({
      interval: config.yahooInterval,
      range: config.yahooRange,
    });

    const response = await fetch(
      `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?${params}`,
    );
    if (!response.ok) {
      throw new Error(
        `Yahoo Finance error ${response.status} for ${symbol}`,
      );
    }

    const data: YahooChartResponse = await response.json();
    if (data.chart.error) {
      throw new Error(`Yahoo Finance: ${data.chart.error.description}`);
    }

    const ohlc = parseChartData(data);
    if (timeframe === 'biweekly') return aggregateBiweekly(ohlc);
    return ohlc;
  },

  async getAllTimeframes(
    ticker: string,
  ): Promise<Record<Timeframe, OHLCData[]>> {
    const [daily, weekly, monthly] = await Promise.all([
      yahooFinance.getChart(ticker, 'daily'),
      yahooFinance.getChart(ticker, 'weekly'),
      yahooFinance.getChart(ticker, 'monthly'),
    ]);

    return {
      daily,
      weekly,
      biweekly: aggregateBiweekly(weekly),
      monthly,
    };
  },
};
