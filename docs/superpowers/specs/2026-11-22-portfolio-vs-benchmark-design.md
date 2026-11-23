# Portfolio history vs. benchmark — design

Date: 2026-11-22

## Intent

The user wants a historical chart of their Trading 212 account value — the
same kind of "account over time" graph the T212 app shows — with the option to
overlay a market benchmark such as the S&P 500.

The question it must answer: **"Would I have been better off just putting every
deposit into an S&P 500 ETF instead of picking stocks myself?"** Secondary: does
my portfolio move with the market (correlation) or not.

## Goals

- Show the real account value (holdings + cash, in account currency) day by day
  from the first deposit until today.
- Overlay a simulated "benchmark account": every deposit buys the benchmark ETF
  on the same day, every withdrawal sells it on the same day. Plotted in the
  same account currency, so the two lines are directly comparable in money.
- Default benchmark (user decision): **Vanguard S&P 500 UCITS ETF, London**
  (Yahoo `VUSA.L`), dividends reinvested.
- Range buttons restart the comparison (user decision, see UI).
- Load without abusing the APIs: a slow first sync (minutes) is acceptable,
  subsequent opens must be near-instant and incremental.

## Non-goals

- Time-weighted / % return comparison (discussed, deferred; may come later as a
  toggle, so don't paint the design into a corner).
- A numeric correlation / beta figure. The user is fine reading correlation
  visually: deposit jumps appear in both lines at once, so they don't distort
  the comparison.
- Tax reporting, realised P&L breakdowns, per-position history.
- Multi-account or server-side storage. Everything stays in the browser, as the
  rest of the app does.

## Anti-goals (failure even if it "works")

- Hammering the T212 / Yahoo APIs or triggering 429 storms that break the rest
  of the app (positions polling, stock charts).
- Silently wrong numbers. If the reconstruction can't value something, the UI
  must say so rather than draw a confident but wrong line.

## Constraints and facts

- **T212 has no account-value-history endpoint.** The history must be rebuilt
  from three paginated endpoints (v0, `limit` max 50, `nextPagePath` cursor,
  documented limit 20 req/min each — the code currently configures 6/min):
  - `GET /equity/history/orders` — items are nested `{ order, fill }`. Use only
    filled orders. `order.side` BUY/SELL, `fill.quantity`, `fill.filledAt`,
    `fill.type` (TRADE, STOCK_SPLIT, STOCK_DISTRIBUTION, SPIN_OFF, …) and
    `fill.walletImpact.{netValue, fxRate, currency, taxes[]}` — the
    account-currency cash impact of the fill.
  - `GET /equity/history/transactions` — `type` ∈ DEPOSIT, WITHDRAW, FEE,
    TRANSFER, INTEREST_ON_FREE_CASH, LENDING_INTEREST; `amount`, `currency`,
    `dateTime`. Whether `amount` is signed is undocumented — verify on a live
    response.
  - `GET /equity/history/dividends` — `amount` in account currency, `paidOn`,
    `ticker`.
  - The existing `T212HistoryItem` type in `src/types/trading212.ts` is a flat
    legacy shape that does not match the documented nested schema; replace it.
- Prices come from Yahoo through the existing `/api/yahoo` proxy and the
  existing `yahooConnection` queue (2 s min gap, auto back-off on 429).
- T212 → Yahoo ticker resolution already exists (`resolveYahooTicker` +
  user-editable ticker map in Settings). Reuse it.
- Storage is `localStorage`. The existing `writeJSON` evicts `t212_price_*`
  keys under quota pressure; history caches must use a different prefix so they
  are never evicted by that mechanism.
- Account currency is available from the app context (`accountCurrency`).
- Charting library: `lightweight-charts` v5 (already used for stock charts).

## Approaches considered

1. **Rebuild from the T212 API with a persistent incremental cache** — *chosen.*
   Fully automatic. First sync: ~1–4 min of T212 paging plus ~2 s per distinct
   Yahoo symbol. Afterwards only new events and recent prices are fetched.
2. **CSV import** — user exports history from the T212 app and drops the file
   in. Zero T212 API load, but manual and stale until re-imported. Rejected
   because the user wants it to stay current without effort.
3. **Record daily snapshots going forward** — trivially light but has no past,
   so it cannot answer the question. Rejected.

Comparison mode: the user picked **"what if every deposit went into the ETF"**
(money-weighted, account currency) over % time-weighted return. Withdrawals
mirror deposits (sell benchmark units on the same day).

## How it works

### 1. Sync (data layer)

- New service functions to page through all three history endpoints via the
  existing T212 `ConnectionManager` queue (rate-limit rules already exist for
  these paths).
- Persist raw events in localStorage under a dedicated prefix (e.g.
  `t212_hist_orders`, `t212_hist_tx`, `t212_hist_div`).
- Incremental sync: endpoints return newest first; on later syncs, page only
  until an already-stored id/reference is reached.
- Sync runs when the chart card mounts (and via a manual refresh button), not
  on the positions polling interval.

### 2. Reconstruction (pure functions, unit-testable)

Produce a daily series from first deposit to today:

- **Cash(t)** = cumulative sum of: deposits (+), withdrawals (−), fill
  `walletImpact.netValue` (buys −, sells +, includes taxes/fees), dividends (+),
  FEE (−), interest (+).
- **Holdings(t)** = per ticker, cumulative quantity from fills (including
  corporate-action fill types).
- **Account value(t)** = Cash(t) + Σ quantity × close(t) × FX(t) for each
  non-account-currency instrument.
- **Benchmark account(t)**: on each deposit/withdrawal day, convert the amount
  to the benchmark's currency at that day's FX and buy/sell fractional units at
  the benchmark's dividend-adjusted close. **Dividends are reinvested** (user
  decision): using Yahoo's `adjclose` series is mathematically equivalent to
  reinvesting every distribution into more units on its ex-date, so no
  separate dividend handling is needed for the benchmark. Value =
  units × adjclose(t) × FX(t) back into account currency.
- Non-trading days carry the last known price forward.

### 3. Prices

- One Yahoo daily-interval request per distinct symbol ever held, plus the
  benchmark(s), plus one FX pair (`XXXYYY=X`) per foreign currency involved.
  Range: from first event date to today (`period1`/`period2` rather than the
  fixed `range` presets the existing `getChart` uses).
- Cache long-term daily closes (past days never change); on later opens only
  re-fetch the recent tail.
- **Splits:** Yahoo's `close` is split-adjusted, while T212 quantities are
  actual. The builder must make holdings × price consistent (e.g. use Yahoo
  split events to un-adjust, or rely on T212 STOCK_SPLIT fills and adjust
  quantities instead — verify which matches reality on a ticker with a known
  split).

### 4. Honesty checks

- Compare reconstructed value for today against the live `/equity/account/cash`
  `total`. Show the difference in the card (e.g. "reconstruction within 0.4% of
  live value"); if it's large, flag it visibly.
- Tickers that can't be priced (no Yahoo mapping, delisted) are listed in a
  warning with a link to Settings → ticker map. Until fixed, value them at their
  last fill price carried forward and mark the line as approximate.

### 5. UI

A new card on the Dashboard, below the account summary:

```
┌ Portfolio vs benchmark ─────────────── [1M 3M YTD 1Y All] [⟳] ┐
│ Benchmark: [Vanguard S&P 500 (VUSA) ▾]                                   │
│                                                                │
│   ── My account   ── If invested in VUSA  ·· Net deposited     │
│   (line chart, account currency, crosshair tooltip with        │
│    both values + difference on hovered day)                    │
│                                                                │
│ My account €12,340 · VUSA alternative €13,010 · Δ −€670 (−5.1%) │
│ Deposited €10,000 · Reconstruction within 0.4% of live value   │
└────────────────────────────────────────────────────────────────┘
```

- During first sync: progress text ("Fetching order history… page 4",
  "Loading prices 12/31") instead of the chart.
- **Range selection restarts the comparison** (user decision). Picking 1Y
  means: on the first day of the range the benchmark account is seeded with
  the real account value on that day, then only deposits/withdrawals inside
  the range flow into it. "All" seeds from the first deposit. Footer numbers
  (both values, Δ, deposited) refer to the selected range only. The
  reconstruction of the real account is done once; the benchmark simulation is
  cheap and re-run per range.
- "Net deposited" step line (cumulative deposits − withdrawals) is shown so
  the user can see how much of each line is their own money.

## Decisions made by Claude (user can override)

- Placement: Dashboard card (not a separate page).
- Benchmark ticker `VUSA.L` (distributing share class, history back to 2012)
  using `adjclose` for reinvestment, rather than the accumulating `VUAG.L`,
  which only exists since 2019 and could miss early account history. The two
  track the same index; results are equivalent.
- `VUSA.L` trades in GBP: convert with the GBP→account-currency FX pair. The
  builder must read Yahoo `meta.currency` for every symbol and divide by 100
  when it is `GBp` (pence), which is common for `.L` listings.
- Extra presets alongside the default: Vanguard FTSE All-World (`VWRL.L`) and
  Invesco Nasdaq-100 (`EQQQ.L`). One benchmark overlaid at a time.
- Range buttons 1M / 3M / YTD / 1Y / All; default All.
- Net-deposited reference line included.
- Reconstruction-vs-live accuracy indicator included.
- Unpriceable tickers: last fill price carried forward + visible warning.
- Withdrawal larger than the benchmark account holds: benchmark units clamp at
  zero, the shortfall is recorded, and the card shows a note from that day
  ("benchmark account emptied on <date>; €X of the withdrawal couldn't be
  covered"). No negative units / implicit borrowing.
- Storage: history caches (raw events + long-range daily prices) may use
  IndexedDB instead of localStorage, since localStorage writes fail silently
  on quota and the instrument cache already uses a big share of it.
- TRANSFER transactions treated as external flows (like deposit/withdrawal)
  for both lines — verify direction/sign on live data.

## Left to the builder

- Exact cache key layout, data structures, and module boundaries.
- Updating the T212 rate-limit rules to the documented 20/min if verified.
- How to page Yahoo for long ranges if a single request is truncated.
- Chart styling consistent with the existing candlestick chart and theme.
