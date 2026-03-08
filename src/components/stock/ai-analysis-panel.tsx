import { useState, useCallback } from 'react';
import {
  Loader2,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Newspaper,
  ShieldAlert,
  Rocket,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { analyzeStock, type StockAnalysis, type NewsItem } from '@/services/anthropic';

interface AIAnalysisPanelProps {
  ticker: string;
  name?: string;
  currentPrice?: number;
  averagePrice?: number;
  currency?: string;
}

const SENTIMENT_CONFIG = {
  bullish: {
    label: 'Bullish',
    icon: TrendingUp,
    className: 'text-green-600 dark:text-green-400',
    badgeClassName: 'bg-green-500/20 text-green-700 dark:text-green-400',
  },
  bearish: {
    label: 'Bearish',
    icon: TrendingDown,
    className: 'text-red-600 dark:text-red-400',
    badgeClassName: 'bg-red-500/20 text-red-700 dark:text-red-400',
  },
  neutral: {
    label: 'Neutral',
    icon: Minus,
    className: 'text-yellow-600 dark:text-yellow-400',
    badgeClassName: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  },
} as const;

const IMPACT_STYLE = {
  positive: 'border-l-green-500',
  negative: 'border-l-red-500',
  neutral: 'border-l-yellow-500',
} as const;

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className={cn('border-l-4 pl-3 py-1.5 space-y-0.5', IMPACT_STYLE[item.impact])}>
      <p className="text-sm font-medium leading-snug">{item.headline}</p>
      <p className="text-xs text-muted-foreground">
        {item.source} &middot; {item.date}
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
    </div>
  );
}

export function AIAnalysisPanel({
  ticker,
  name,
  currentPrice,
  averagePrice,
  currency,
}: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeStock({ ticker, name, currentPrice, averagePrice, currency });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [ticker, name, currentPrice, averagePrice, currency]);

  // Initial state — prompt user to generate
  if (!analysis && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-lg font-medium">AI Stock Analysis</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Get an AI-powered analysis of {name ?? ticker} including latest news,
            market sentiment, and short-term outlook.
          </p>
        </div>
        <Button onClick={runAnalysis} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Analysis
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Searching the web and analyzing {name ?? ticker}...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <ShieldAlert className="h-10 w-10 text-red-500" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Button variant="outline" onClick={runAnalysis} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!analysis) return null;

  const sentimentCfg = SENTIMENT_CONFIG[analysis.sentiment];
  const SentimentIcon = sentimentCfg.icon;
  const generatedTime = new Date(analysis.generatedAt).toLocaleString();

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={sentimentCfg.badgeClassName}>
            <SentimentIcon className="mr-1 h-3 w-3" />
            {sentimentCfg.label}
          </Badge>
          <span className="text-xs text-muted-foreground">Generated {generatedTime}</span>
        </div>
        <Button variant="outline" size="sm" onClick={runAnalysis} disabled={loading} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Sentiment rationale */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <SentimentIcon className={cn('h-4 w-4', sentimentCfg.className)} />
            <CardTitle className="text-sm">Sentiment Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.sentimentRationale}</p>
        </CardContent>
      </Card>

      {/* News */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Latest News</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.news.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </CardContent>
      </Card>

      {/* Outlook, Catalysts, Risks — 3-column grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm">Short-Term Outlook</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.outlook}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm">Catalysts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {analysis.catalysts.map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-green-600 shrink-0">+</span>
                  {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm">Risks</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {analysis.risks.map((r, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-red-500 shrink-0">-</span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center italic">
        This analysis is AI-generated and simulated. It does not constitute financial advice.
        Always do your own research before making investment decisions.
      </p>
    </div>
  );
}
