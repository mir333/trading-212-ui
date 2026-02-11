# Trading 212 Portfolio Dashboard - Design Document

## Overview

Browser-based React app that connects to the Trading 212 API to monitor portfolio positions, displays candlestick charts with technical analysis overlays, and generates buy/sell signals based on multiple indicators across daily, weekly, biweekly, and monthly timeframes.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Charting**: Lightweight Charts (TradingView)
- **Market Data**: Yahoo Finance (OHLC history)
- **Portfolio Data**: Trading 212 REST API (polling)
- **Storage**: localStorage (all data browser-side)
- **CORS**: Vite dev server proxy

## Architecture

### Data Flow

1. User enters Trading 212 API credentials (stored encrypted in localStorage)
2. App fetches portfolio positions via Trading 212 API (through Vite proxy)
3. For each stock, app fetches OHLC history from Yahoo Finance (through Vite proxy)
4. Polling engine refreshes positions on a configurable interval (respecting rate limits)
5. Technical analysis runs client-side on the price data
6. Charts render with overlays; buy/sell signals are computed and displayed

### Pages

- **Dashboard** - Account summary, portfolio value, top movers, signal overview
- **Portfolio** - Full position list with P&L, sortable/filterable, buy/sell badges
- **Stock Detail** - Candlestick chart with overlays, multi-timeframe tabs, signal breakdown
- **Settings** - API credentials, polling interval, theme

## Technical Analysis

### Trendlines (per timeframe: daily, weekly, biweekly, monthly)

- **SMA** - 20-period and 50-period simple moving averages
- **EMA** - 12-period and 26-period exponential moving averages
- **Linear Regression** - Best-fit line through closing prices with slope and R² value

### Additional Indicators

- **RSI(14)** - 14-period relative strength index
- **MACD** - EMA-12 minus EMA-26 with 9-period signal line and histogram
- **Bollinger Bands** - 20-period SMA +/- 2 standard deviations

### Signal Scoring

Each stock gets a composite score (-100 to +100):

| Signal | Buy (+) | Sell (-) |
|--------|---------|----------|
| SMA Crossover | SMA-20 > SMA-50 | SMA-20 < SMA-50 |
| EMA Crossover | EMA-12 > EMA-26 | EMA-12 < EMA-26 |
| RSI | Below 30 (oversold) | Above 70 (overbought) |
| MACD | MACD > signal line | MACD < signal line |
| Bollinger | Price near lower band | Price near upper band |
| Regression | Positive slope | Negative slope |

Signals averaged across active timeframes into badge: Strong Buy, Buy, Hold, Sell, Strong Sell.

## Proxy Configuration

- `/api/t212` -> `https://live.trading212.com/api/v0`
- `/api/yahoo` -> `https://query1.finance.yahoo.com/v8/finance`

## Polling

- Positions: 60s default interval
- Price data: 5min default interval
- Respects rate limit headers, pauses on hidden tab
- User-configurable in Settings

## localStorage Schema

- `t212_credentials` - Encrypted API key/secret
- `portfolio_positions` - Cached positions with timestamp
- `price_cache_{ticker}` - OHLC data per stock with expiry
- `user_preferences` - Polling interval, theme, timeframes
- `signals_cache` - Computed signals with timestamp

## Component Tree

```
App
├── Layout (sidebar nav + header)
├── Dashboard
│   ├── AccountSummaryCard
│   ├── PortfolioDonut
│   ├── SignalOverview
│   └── TopMovers
├── Portfolio
│   ├── PositionTable
│   ├── PortfolioMetrics
│   └── FilterBar
├── StockDetail
│   ├── TimeframeTabs
│   ├── CandlestickChart
│   ├── IndicatorPanels
│   ├── SignalBreakdown
│   └── StockInfo
└── Settings
    ├── ApiKeyForm
    ├── PollingConfig
    └── ThemeToggle
```

## Project Structure

```
src/
├── components/ui/        # shadcn components
├── components/dashboard/ # Dashboard page components
├── components/portfolio/ # Portfolio page components
├── components/stock/     # Stock detail components
├── components/settings/  # Settings page components
├── services/
│   ├── trading212.ts     # T212 API client
│   ├── yahoo-finance.ts  # Yahoo Finance client
│   ├── polling.ts        # Polling engine
│   └── storage.ts        # localStorage wrapper
├── lib/
│   ├── indicators.ts     # SMA, EMA, RSI, MACD, Bollinger
│   ├── trendlines.ts     # Linear regression
│   ├── signals.ts        # Signal scoring & badges
│   └── utils.ts          # Helpers
├── hooks/                # Custom React hooks
├── pages/                # Page components
└── types/                # TypeScript interfaces
```
