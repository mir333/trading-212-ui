// ---------------------------------------------------------------------------
// Anthropic AI stock analysis service (simulated)
//
// Simulates what a real Claude API call with web_search tool would return.
// When ready to go live, replace `analyzeStock` with a real fetch to
// /api/anthropic/v1/messages using the Anthropic Messages API.
// ---------------------------------------------------------------------------

export interface StockAnalysis {
  news: NewsItem[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentRationale: string;
  outlook: string;
  risks: string[];
  catalysts: string[];
  generatedAt: number;
}

export interface NewsItem {
  headline: string;
  source: string;
  date: string;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface AnalyzeStockParams {
  ticker: string;
  name?: string;
  currentPrice?: number;
  averagePrice?: number;
  currency?: string;
}

const SIMULATED_DELAY_MS = 2500;

export async function analyzeStock(params: AnalyzeStockParams): Promise<StockAnalysis> {
  // Simulate network + AI processing time
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));

  const { ticker, name, currentPrice, averagePrice, currency = 'USD' } = params;
  const displayName = name ?? ticker;
  const priceStr = currentPrice ? `${currency} ${currentPrice.toFixed(2)}` : 'N/A';
  const inProfit = currentPrice && averagePrice ? currentPrice > averagePrice : null;

  // Generate realistic-looking simulated data
  const sentiments = ['bullish', 'bearish', 'neutral'] as const;
  const sentiment = sentiments[Math.floor(Math.random() * 3)];

  const analysis: StockAnalysis = {
    news: [
      {
        headline: `${displayName} reports stronger-than-expected quarterly earnings`,
        source: 'Reuters',
        date: getRelativeDate(-1),
        summary: `${displayName} exceeded analyst expectations with revenue growth of 12% year-over-year. Management raised full-year guidance citing strong demand across key segments.`,
        impact: 'positive',
      },
      {
        headline: `Analysts raise price targets for ${ticker} amid sector rotation`,
        source: 'Bloomberg',
        date: getRelativeDate(-3),
        summary: `Multiple Wall Street firms have revised their price targets upward for ${displayName}, with the consensus target now sitting 8% above the current trading price of ${priceStr}.`,
        impact: 'positive',
      },
      {
        headline: `${displayName} faces headwinds from regulatory scrutiny in European markets`,
        source: 'Financial Times',
        date: getRelativeDate(-5),
        summary: `EU regulators have opened a preliminary investigation into ${displayName}'s market practices. Analysts expect limited financial impact but note potential for increased compliance costs.`,
        impact: 'negative',
      },
      {
        headline: `Institutional investors increase positions in ${ticker}`,
        source: 'MarketWatch',
        date: getRelativeDate(-7),
        summary: `SEC filings reveal that several major institutional investors have increased their holdings in ${displayName} during the latest quarter, signaling long-term confidence.`,
        impact: 'positive',
      },
      {
        headline: `Sector outlook: mixed signals for ${displayName}'s industry peers`,
        source: 'CNBC',
        date: getRelativeDate(-10),
        summary: `Industry peers have reported mixed results this quarter. While fundamentals remain solid, macroeconomic uncertainty and interest rate policy continue to weigh on valuations across the sector.`,
        impact: 'neutral',
      },
    ],
    sentiment,
    sentimentRationale: buildSentimentRationale(sentiment, displayName, priceStr, inProfit),
    outlook: buildOutlook(sentiment, displayName, priceStr),
    risks: [
      'Macroeconomic slowdown could reduce consumer/enterprise spending',
      'Regulatory changes in key markets may increase compliance costs',
      'Competitive pressure from emerging players in adjacent segments',
      'Foreign exchange volatility affecting international revenue',
    ],
    catalysts: [
      'Upcoming product launches expected in the next quarter',
      'Potential expansion into new geographic markets',
      'Cost optimization initiatives beginning to show results',
      'Industry tailwinds from favorable policy environment',
    ],
    generatedAt: Date.now(),
  };

  return analysis;
}

function getRelativeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildSentimentRationale(
  sentiment: string,
  name: string,
  price: string,
  inProfit: boolean | null,
): string {
  const profitNote =
    inProfit === true
      ? ' The position is currently in profit, which aligns with the positive momentum.'
      : inProfit === false
        ? ' The position is currently underwater, but the fundamental picture may support a recovery.'
        : '';

  switch (sentiment) {
    case 'bullish':
      return `Based on recent earnings beats, raised guidance, and increased institutional buying, the overall sentiment for ${name} (trading at ${price}) is bullish. Technical indicators and analyst consensus support continued upward momentum in the near term.${profitNote}`;
    case 'bearish':
      return `Despite some positive earnings data, regulatory headwinds and sector-wide uncertainty create a cautious outlook for ${name} (trading at ${price}). The risk/reward profile has shifted, and several analysts have flagged potential downside.${profitNote}`;
    default:
      return `The picture for ${name} (trading at ${price}) is mixed. Strong earnings are offset by regulatory concerns and macroeconomic uncertainty. The stock is likely to trade sideways until clearer catalysts emerge.${profitNote}`;
  }
}

function buildOutlook(sentiment: string, name: string, price: string): string {
  switch (sentiment) {
    case 'bullish':
      return `Short-term outlook for ${name} is positive. At ${price}, the stock appears to have room to run based on consensus price targets. Key upcoming events include the next earnings release and any regulatory updates. Consider maintaining or adding to positions on pullbacks.`;
    case 'bearish':
      return `Short-term outlook for ${name} is cautious. At ${price}, the stock may face further pressure from regulatory developments and sector rotation. Consider reducing exposure or setting tight stop-losses. Watch for the next earnings report as a potential inflection point.`;
    default:
      return `Short-term outlook for ${name} is neutral. At ${price}, the stock is fairly valued based on current fundamentals. Wait for clearer directional signals before adjusting positions. The next earnings release and regulatory developments will be key catalysts to watch.`;
  }
}
