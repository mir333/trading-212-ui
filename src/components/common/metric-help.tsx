import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type MetricKey =
  // Position info
  | 'currentPrice'
  | 'avgPrice'
  | 'quantity'
  | 'pnl'
  | 'pnlPct'
  // Chart overlays
  | 'sma'
  | 'ema'
  | 'bollinger'
  | 'regression'
  // Indicator panels
  | 'rsi'
  | 'macd'
  // Signal system
  | 'compositeSignal'
  | 'signalBreakdown'
  // Signal details
  | 'smaCrossover'
  | 'emaCrossover'
  | 'rsiSignal'
  | 'macdSignal'
  | 'bollingerSignal'
  | 'regressionSignal'
  // Regression analysis
  | 'slope'
  | 'rSquared'
  | 'trendDirection';

interface MetricInfo {
  title: string;
  description: string;
  howItWorks: string;
  howToRead: string;
}

const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  // ── Position info ──────────────────────────────────────────────
  currentPrice: {
    title: 'Current Price',
    description:
      'The latest trading price of this stock from Trading 212.',
    howItWorks:
      'This is the most recent price at which this stock was traded on the market. It updates whenever your portfolio data refreshes.',
    howToRead:
      'This is roughly what you would pay if you bought more shares right now (actual price may differ slightly due to spread).',
  },
  avgPrice: {
    title: 'Average Price',
    description:
      'The average price you paid across all your purchases of this stock.',
    howItWorks:
      'If you bought shares at different times and prices, this blends all your purchase prices together, weighted by how many shares you bought each time. For example, buying 10 shares at $50 and 10 shares at $60 gives an average of $55.',
    howToRead:
      'Compare this to the Current Price. If the current price is higher, you are in profit. If lower, you are at a loss.',
  },
  quantity: {
    title: 'Quantity',
    description: 'How many shares (or fractional shares) you own of this stock.',
    howItWorks:
      'This includes whole shares and fractional shares. Trading 212 allows buying fractions of expensive stocks, so you might own 0.5 shares of a stock that costs $1,000 per share.',
    howToRead:
      'Multiply this by the current price to get the total market value of your position.',
  },
  pnl: {
    title: 'Profit & Loss (P&L)',
    description:
      'How much money you have made or lost on this position, in your account currency.',
    howItWorks:
      'Calculated as: (Current Value) - (What You Paid). This includes any currency exchange effects if the stock trades in a different currency than your account.',
    howToRead:
      'Green = you are in profit. Red = you are at a loss. This is an unrealised gain/loss - you only lock it in when you sell.',
  },
  pnlPct: {
    title: 'P&L Percentage',
    description:
      'Your profit or loss expressed as a percentage of your original investment.',
    howItWorks:
      'Calculated as: ((Current Value - Cost) / Cost) x 100. For example, if you invested $100 and it is now worth $110, your P&L% is +10%.',
    howToRead:
      'This tells you the return on your investment. +10% means your money grew by 10%. -5% means you have lost 5% of what you put in. Useful for comparing performance across different-sized positions.',
  },

  // ── Chart overlays ─────────────────────────────────────────────
  sma: {
    title: 'SMA (Simple Moving Average)',
    description:
      'Smooth lines on the chart that show the average price over a set number of periods, helping you see the trend without daily noise.',
    howItWorks:
      'SMA20 averages the closing price over the last 20 periods. SMA50 does the same over 50 periods. Each new period, the oldest price drops off and the newest is added. It is a simple arithmetic average.',
    howToRead:
      'When the faster line (SMA20) crosses above the slower line (SMA50), it is called a "golden cross" and suggests an upward trend. The opposite crossing ("death cross") suggests a downward trend. If the price is above both lines, the trend is generally bullish.',
  },
  ema: {
    title: 'EMA (Exponential Moving Average)',
    description:
      'Similar to SMA, but gives more importance to recent prices so it reacts faster to new price movements.',
    howItWorks:
      'EMA12 and EMA26 work like SMA but use a formula that weights recent prices more heavily. This makes the line "stick closer" to the current price and respond more quickly to changes.',
    howToRead:
      'Use the same crossover logic as SMA. When EMA12 crosses above EMA26, it signals upward momentum. EMA tends to give earlier signals than SMA, but can also produce more false alarms in choppy markets.',
  },
  bollinger: {
    title: 'Bollinger Bands',
    description:
      'Three lines around the price that show how volatile the stock is and whether it might be overbought or oversold.',
    howItWorks:
      'The middle line is a 20-period SMA. The upper and lower bands are placed 2 standard deviations above and below it. When the stock is more volatile, the bands spread apart. When calm, they squeeze together.',
    howToRead:
      'Price touching the lower band can mean the stock is oversold (potential buying opportunity). Price touching the upper band can mean overbought (potential time to sell). When the bands squeeze very tight, a big price move often follows - but the direction is not guaranteed.',
  },
  regression: {
    title: 'Linear Regression',
    description:
      'A straight "best fit" line drawn through the price data to show the overall trend direction.',
    howItWorks:
      'Uses a statistical method (least squares) to find the straight line that best fits all the closing prices in the current timeframe. Think of it as drawing a ruler through the chart that minimises the distance to all price points.',
    howToRead:
      'If the line points upward, the stock has an overall upward trend. If downward, the trend is down. The steeper the line, the stronger the trend. This helps you see the "big picture" without getting distracted by short-term ups and downs.',
  },

  // ── Indicator panels ───────────────────────────────────────────
  rsi: {
    title: 'RSI (Relative Strength Index)',
    description:
      'A momentum gauge from 0 to 100 that measures whether a stock has been rising or falling too fast recently.',
    howItWorks:
      'RSI looks at the last 14 periods and compares the size of up-moves to down-moves. If the stock has been going up a lot, RSI goes higher. If falling a lot, RSI goes lower. The formula normalises this into a 0-100 scale.',
    howToRead:
      'Below 30 (green dashed line) = the stock may be "oversold" - it has fallen a lot and could bounce back. Above 70 (red dashed line) = "overbought" - it has risen a lot and could pull back. Between 30-70 is neutral territory. RSI works best in ranging markets, not strong trends.',
  },
  macd: {
    title: 'MACD (Moving Average Convergence Divergence)',
    description:
      'A momentum indicator that tracks the relationship between two moving averages, showing when buying or selling pressure is building.',
    howItWorks:
      'The blue MACD line is the difference between EMA12 and EMA26. The red signal line is a 9-period average of the MACD line. The green/red bars (histogram) show the gap between the MACD and signal lines.',
    howToRead:
      'When the blue line crosses above the red line, buying momentum is building (bullish). When it crosses below, selling momentum is growing (bearish). The bars getting taller mean momentum is increasing. Bars shrinking suggest the current move is losing steam.',
  },

  // ── Signal system ──────────────────────────────────────────────
  compositeSignal: {
    title: 'Composite Signal',
    description:
      'An overall buy/sell recommendation that combines all six indicators across all timeframes into a single score.',
    howItWorks:
      'Each indicator (SMA, EMA, RSI, MACD, Bollinger, Regression) "votes" bullish (+1), bearish (-1), or neutral (0). These votes are averaged into a score from -100 to +100. The scores from all timeframes (daily, weekly, biweekly, monthly) are then averaged together.',
    howToRead:
      'Strong Buy (+50 or higher): Most indicators across most timeframes are bullish. Buy (+20 to +49): Generally bullish outlook. Hold (-19 to +19): Mixed signals, no clear direction. Sell (-20 to -49): Generally bearish. Strong Sell (-50 or lower): Most indicators are bearish. Remember: no indicator is perfect - always consider the bigger picture and do your own research.',
  },
  signalBreakdown: {
    title: 'Signal Breakdown',
    description:
      'A detailed view of what each individual indicator is saying for each timeframe, so you can see which ones agree and which disagree.',
    howItWorks:
      'For each timeframe (daily, weekly, biweekly, monthly), six indicators are evaluated independently. Each one gives a bullish, bearish, or neutral reading. These are combined into a per-timeframe score, and then all timeframes are averaged for the composite.',
    howToRead:
      'Look for agreement. If most indicators across most timeframes say "Bullish", the signal is stronger. If some say bullish and others bearish, the situation is unclear (hold). Different timeframes can tell different stories - for example, a stock might be bullish on daily but bearish on monthly.',
  },

  // ── Individual signal details ──────────────────────────────────
  smaCrossover: {
    title: 'SMA Crossover (20/50)',
    description:
      'Compares the 20-period and 50-period Simple Moving Averages to detect trend changes.',
    howItWorks:
      'Checks whether SMA20 is above or below SMA50. When the shorter (faster) average is above the longer (slower) one, it means recent prices are higher than older prices - an uptrend.',
    howToRead:
      'Bullish: SMA20 is above SMA50 (uptrend). Bearish: SMA20 is below SMA50 (downtrend). This is a lagging indicator - it confirms trends that have already started, rather than predicting new ones.',
  },
  emaCrossover: {
    title: 'EMA Crossover (12/26)',
    description:
      'Same idea as SMA crossover but using Exponential Moving Averages that react faster to recent price changes.',
    howItWorks:
      'Checks whether EMA12 is above or below EMA26. Because EMA weighs recent prices more heavily, it responds to changes faster than SMA.',
    howToRead:
      'Bullish: EMA12 is above EMA26 (recent momentum is upward). Bearish: EMA12 is below EMA26 (recent momentum is downward). Gives earlier signals than SMA crossover but may produce more false signals.',
  },
  rsiSignal: {
    title: 'RSI Signal',
    description:
      'Whether the RSI indicator currently shows the stock as oversold, overbought, or neutral.',
    howItWorks:
      'Takes the current RSI value and classifies it: below 30 = oversold (bullish signal because the stock may be due for a bounce), above 70 = overbought (bearish signal because it may be due for a pullback), between 30-70 = neutral.',
    howToRead:
      'Bullish (oversold): The stock has dropped a lot recently - it might recover. Bearish (overbought): The stock has risen a lot recently - it might cool off. Neutral: No extreme reading.',
  },
  macdSignal: {
    title: 'MACD Signal',
    description:
      'Whether the MACD line is above or below its signal line, indicating the direction of momentum.',
    howItWorks:
      'Checks the relationship between the MACD line (EMA12 minus EMA26) and its signal line (9-period EMA of the MACD). When MACD is above its signal line, momentum is building upward.',
    howToRead:
      'Bullish: MACD line is above the signal line (buying pressure is stronger). Bearish: MACD line is below the signal line (selling pressure is stronger).',
  },
  bollingerSignal: {
    title: 'Bollinger Bands Signal',
    description:
      'Whether the price is near the top or bottom of the Bollinger Bands, suggesting overbought or oversold conditions.',
    howItWorks:
      'Checks where the closing price sits relative to the upper and lower bands. If the price is in the bottom 10% of the band range, it is considered near the lower band. If in the top 10%, near the upper band.',
    howToRead:
      'Bullish (near lower band): Price has dropped to the bottom of its recent range - could be a buying opportunity. Bearish (near upper band): Price is at the top of its range - could be stretched. Neutral: Price is somewhere in the middle.',
  },
  regressionSignal: {
    title: 'Trend (Regression) Signal',
    description:
      'Whether the overall price trend line is pointing up, down, or flat.',
    howItWorks:
      'Uses the slope of the linear regression line. A positive slope means prices have generally been increasing. A negative slope means they have been decreasing.',
    howToRead:
      'Bullish: The trend is upward - prices have been rising over this timeframe. Bearish: The trend is downward - prices have been falling. This is a big-picture view and does not capture short-term reversals.',
  },

  // ── Regression analysis ────────────────────────────────────────
  slope: {
    title: 'Slope',
    description:
      'How steeply the trend line is going up or down.',
    howItWorks:
      'The slope is a number from the linear regression calculation. A positive number means the trend line goes up from left to right. A negative number means it goes down. A larger absolute value means a steeper trend.',
    howToRead:
      'Positive = the stock has been trending upward. Negative = trending downward. A slope of 0.5 means the trend line rises by $0.50 per period on average. Compare the slope across different timeframes to see if the short-term and long-term trends agree.',
  },
  rSquared: {
    title: 'R-Squared',
    description:
      'A "confidence score" for the trend line - how well it fits the actual price data.',
    howItWorks:
      'R-squared ranges from 0 to 1. It measures what percentage of the price movement is explained by the straight trend line. An R-squared of 0.85 means 85% of the price action follows the trend.',
    howToRead:
      'Close to 1 (e.g., 0.8-1.0): The price has been moving in a very clean, consistent direction. The trend is reliable. Close to 0 (e.g., 0-0.3): The price has been choppy with no clear direction. The trend line does not describe the movement well. Medium (0.3-0.8): There is some trend but with notable noise around it.',
  },
  trendDirection: {
    title: 'Trend Direction',
    description:
      'A simple summary of whether the stock is trending up, down, or sideways.',
    howItWorks:
      'Derived from the regression slope. If the slope is positive, the direction is "Upward". If negative, "Downward". If essentially zero, "Flat".',
    howToRead:
      'Upward (green): The overall movement has been upward over this timeframe. Downward (red): The overall movement has been downward. Flat (yellow): No clear direction - the stock has been trading sideways.',
  },
};

// Map signal detail names from the signals library to metric keys
const SIGNAL_DETAIL_KEY_MAP: Record<string, MetricKey> = {
  'SMA Crossover (20/50)': 'smaCrossover',
  'EMA Crossover (12/26)': 'emaCrossover',
  'RSI': 'rsiSignal',
  'MACD': 'macdSignal',
  'Bollinger Bands': 'bollingerSignal',
  'Trend (Regression)': 'regressionSignal',
};

export function getSignalDetailKey(detailName: string): MetricKey | null {
  return SIGNAL_DETAIL_KEY_MAP[detailName] ?? null;
}

interface MetricHelpProps {
  metricKey: MetricKey;
  className?: string;
}

export function MetricHelp({ metricKey, className }: MetricHelpProps) {
  const info = METRIC_INFO[metricKey];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ''}`}
          aria-label={`Learn about ${info.title}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription>{info.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold">How it works</h4>
            <p className="text-sm text-muted-foreground">{info.howItWorks}</p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-semibold">How to read it</h4>
            <p className="text-sm text-muted-foreground">{info.howToRead}</p>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
