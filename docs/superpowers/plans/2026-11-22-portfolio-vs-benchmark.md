# Portfolio vs Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Dashboard card that charts the user's reconstructed Trading 212 account value over time against a simulated "every deposit went into Vanguard S&P 500 (VUSA.L)" account.

**Architecture:** Raw T212 history (orders, transactions, dividends) is synced incrementally into IndexedDB and normalized into `Fill`/`CashFlow` events. Pure functions rebuild a daily account-value series from those events plus Yahoo daily prices/FX, and simulate the benchmark account from external flows. A hook orchestrates sync → prices → reconstruction; a card renders it with `lightweight-charts`.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, lightweight-charts 5, shadcn/ui, IndexedDB (no wrapper lib), Vitest (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-11-22-portfolio-vs-benchmark-design.md`

## Global Constraints

- All money in the chart is in the account currency (`accountCurrency` from `useAppContext()`).
- Default benchmark `VUSA.L`, dividends reinvested via Yahoo `adjclose`. Presets: `VUSA.L` "Vanguard S&P 500 (VUSA)", `VWRL.L` "Vanguard FTSE All-World (VWRL)", `EQQQ.L` "Invesco Nasdaq-100 (EQQQ)". One overlaid at a time.
- Yahoo prices with `meta.currency` of `GBp` or `GBX` are divided by 100 and treated as `GBP`.
- External flows (mirrored into the benchmark): DEPOSIT, WITHDRAW, TRANSFER. Fees, interest, dividends are internal.
- Benchmark units never go negative; a withdrawal larger than the benchmark holds empties it and records a shortfall.
- Range buttons `1M` `3M` `YTD` `1Y` `ALL` (default `ALL`) restart the comparison: benchmark seeded with the real account value on the range's first day.
- History caches live in IndexedDB, never in `localStorage`.
- All T212 calls go through the existing `t212Connection` queue; all Yahoo calls through `yahooConnection`.
- Sync runs on card mount and on the card's refresh button only — not on the positions polling interval.
- Sign conventions of T212 amounts are undocumented: derive signs from `type` / `side` and `Math.abs` the raw amount (TRANSFER keeps its raw sign).

## Review Focus

1. London listings quoted in pence (`GBp`) — a 100× value error if not normalized. Test in Task 2.
2. A stock split while the position is held — the line must not jump at the split date. Test in Task 3.
3. Withdrawing more than the benchmark account holds — clamp at zero + shortfall. Test in Task 4.
4. Deposits/fills on weekends or holidays, and dates before a symbol's first price — carry last price forward; before first price use the first available price. Tests in Tasks 2 and 4.
5. A held ticker Yahoo can't price (unmapped/delisted) — value at last fill cost, list it as unpriced, never drop it to zero. Test in Task 3.

---

## File map

| File | Responsibility |
|---|---|
| `src/types/trading212.ts` (modify) | Replace legacy flat `T212HistoryItem` with documented nested order item; add transaction and dividend item types |
| `src/types/yahoo-finance.ts` (modify) | Add optional `events.splits` to `YahooChartResult` |
| `src/types/portfolio-history.ts` (create) | Domain types shared by all tasks |
| `src/lib/dates.ts` (create) | ISO-date helpers and range start |
| `src/lib/history-normalize.ts` (create) | T212 raw items → `Fill` / `CashFlow` |
| `src/lib/history-merge.ts` (create) | Incremental page merge |
| `src/lib/price-history.ts` (create) | Yahoo daily response → `PriceSeries`, price lookup, FX helpers |
| `src/lib/portfolio-reconstruction.ts` (create) | Daily account value series + diagnostics |
| `src/lib/benchmark-simulation.ts` (create) | Benchmark account series |
| `src/lib/benchmarks.ts` (create) | Benchmark presets |
| `src/services/history-db.ts` (create) | Minimal IndexedDB key–value store |
| `src/services/trading212.ts` (modify) | Paged history endpoints, rate rules |
| `src/services/history-sync.ts` (create) | Incremental sync of all three endpoints |
| `src/services/yahoo-finance.ts` (modify) | `getDailyHistory` by date range |
| `src/services/price-history-cache.ts` (create) | Cached `PriceSeries` loading |
| `src/hooks/use-portfolio-history.ts` (create) | Orchestration hook |
| `src/components/dashboard/portfolio-benchmark-chart.tsx` (create) | The card |
| `src/pages/dashboard.tsx` (modify) | Mount the card |

---

### Task 1: Test setup, domain types, and history normalization

**Files:**
- Modify: `package.json`, `vite.config.ts`, `src/types/trading212.ts`, `src/services/trading212.ts` (only to delete `getOrderHistory`, which uses the removed type)
- Create: `src/types/portfolio-history.ts`, `src/lib/history-normalize.ts`
- Test: `src/lib/history-normalize.test.ts`

**Interfaces:**
- Produces (`src/types/trading212.ts`):
  ```ts
  export interface T212OrderHistoryItem {
    order: { id: number; ticker: string; side: 'BUY' | 'SELL'; status: string; currency: string;
             createdAt: string; instrument: { ticker: string; currency: string; isin: string; name: string } };
    fill?: { id: number; filledAt: string; price: number; quantity: number; type: string;
             walletImpact: { currency: string; fxRate: number; netValue: number; realisedProfitLoss: number;
                             taxes: { name: string; quantity: number; currency: string; chargedAt: string }[] } };
  }
  export interface T212TransactionItem { amount: number; currency: string; dateTime: string; reference: string;
    type: 'WITHDRAW' | 'DEPOSIT' | 'FEE' | 'TRANSFER' | 'INTEREST_ON_FREE_CASH' | 'LENDING_INTEREST'; }
  export interface T212DividendItem { amount: number; currency: string; paidOn: string; reference: string;
    ticker: string; quantity: number; type: string; }
  ```
- Produces (`src/types/portfolio-history.ts`, re-exported from `src/types/index.ts`):
  ```ts
  export type ISODate = string; // YYYY-MM-DD
  export type CashFlowKind = 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'dividend';
  export interface CashFlow { id: string; date: ISODate; kind: CashFlowKind; amount: number; currency: string; external: boolean }
  export interface Fill { id: string; date: ISODate; ticker: string; quantity: number; cashImpact: number; fillType: string }
  export interface HistoryEvents { fills: Fill[]; cashFlows: CashFlow[] }
  export interface PriceSeries { symbol: string; currency: string; closes: Record<ISODate, number>;
    adjCloses: Record<ISODate, number>; splits: { date: ISODate; ratio: number }[] }
  export interface AccountPoint { date: ISODate; value: number; netDeposited: number }
  export interface ExternalFlow { date: ISODate; amount: number } // account currency, signed
  export interface ReconstructionResult { points: AccountPoint[]; externalFlows: ExternalFlow[];
    unpricedTickers: string[]; holdingsToday: Record<string, number>; valueToday: number }
  export interface BenchmarkPoint { date: ISODate; value: number }
  export interface BenchmarkResult { points: BenchmarkPoint[]; shortfall: { date: ISODate; amount: number } | null }
  export type HistoryRange = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
  ```
- Produces (`src/lib/history-normalize.ts`):
  - `normalizeOrders(items: T212OrderHistoryItem[]): Fill[]`
  - `normalizeTransactions(items: T212TransactionItem[]): CashFlow[]`
  - `normalizeDividends(items: T212DividendItem[]): CashFlow[]`

- [ ] **Step 1: Add Vitest**

Run: `npm install -D vitest && bun install` (keeps both lockfiles in sync). Add `"test": "vitest run"` to `package.json` scripts. In `vite.config.ts`, import `defineConfig` from `vitest/config` and add `test: { environment: 'node' }`. Tests import `describe/it/expect` from `'vitest'` explicitly (no globals).

- [ ] **Step 2: Write the failing tests** in `src/lib/history-normalize.test.ts`

```ts
it('orders: BUY gives +qty and negative cash regardless of netValue sign', () => {
  const [f] = normalizeOrders([order({ side: 'BUY', qty: 2, netValue: 101.5, filledAt: '2024-03-04T14:31:00Z' })]);
  expect(f).toMatchObject({ id: 'fill-1', date: '2024-03-04', ticker: 'AAPL_US_EQ', quantity: 2, cashImpact: -101.5, fillType: 'TRADE' });
});
it('orders: SELL gives -qty and positive cash even if netValue is negative', () => {
  const [f] = normalizeOrders([order({ side: 'SELL', qty: 2, netValue: -120 })]);
  expect(f.quantity).toBe(-2); expect(f.cashImpact).toBe(120);
});
it('orders: items without a fill are skipped', () => {
  expect(normalizeOrders([{ ...order({}), fill: undefined }])).toEqual([]);
});
it('transactions: signs come from type', () => {
  const out = normalizeTransactions([
    tx('DEPOSIT', -500), tx('WITHDRAW', 200), tx('FEE', 3), tx('INTEREST_ON_FREE_CASH', -1.2), tx('TRANSFER', -50),
  ]);
  expect(out.map((c) => [c.kind, c.amount, c.external])).toEqual([
    ['deposit', 500, true], ['withdrawal', -200, true], ['fee', -3, false], ['interest', 1.2, false], ['transfer', -50, true],
  ]);
});
it('dividends: positive internal cash flow dated paidOn', () => {
  const [d] = normalizeDividends([{ amount: 4.2, currency: 'EUR', paidOn: '2024-05-10T00:00:00Z', reference: 'r1', ticker: 'X', quantity: 1, type: 'ORDINARY' }]);
  expect(d).toMatchObject({ id: 'div-r1', date: '2024-05-10', kind: 'dividend', amount: 4.2, currency: 'EUR', external: false });
});
```
(`order()` and `tx()` are small local builders; `tx` ids are `tx-<reference>`, `order` fill id `1`, ticker `AAPL_US_EQ`, fill type `TRADE`.)

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run src/lib/history-normalize.test.ts` — Expected: FAIL, module not found.

- [ ] **Step 4: Implement types and the three normalizers**

Dates are `str.slice(0, 10)`. Ids: `fill-${fill.id}`, `tx-${reference}`, `div-${reference}`. Delete `T212HistoryItem` and `trading212.getOrderHistory` (unused elsewhere; Task 5 replaces it).

- [ ] **Step 5: Verify**

Run: `npx vitest run && npx tsc -b` — Expected: tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json bun.lock vite.config.ts src/types src/lib/history-normalize* src/services/trading212.ts docs/superpowers
git commit -m "feat: add history domain types and T212 history normalization"
```

---

### Task 2: Dates and price-history parsing

**Files:**
- Modify: `src/types/yahoo-finance.ts`
- Create: `src/lib/dates.ts`, `src/lib/price-history.ts`
- Test: `src/lib/dates.test.ts`, `src/lib/price-history.test.ts`

**Interfaces:**
- Produces (`src/lib/dates.ts`):
  - `eachDay(from: ISODate, to: ISODate): ISODate[]` — inclusive, UTC.
  - `rangeStartDate(range: HistoryRange, today: ISODate, firstDate: ISODate): ISODate` — `1M`/`3M`/`1Y` subtract calendar months/years, `YTD` = Jan 1 of today's year, `ALL` = firstDate; result never earlier than firstDate.
- Produces (`src/lib/price-history.ts`):
  - `parseDailyHistory(res: YahooChartResponse): PriceSeries`
  - `priceOn(series: Record<ISODate, number>, date: ISODate): number | null` — last value on or before `date`; if `date` precedes all values, the first value; `null` only for an empty series.
  - `fxSymbol(from: string, to: string): string` → `` `${from}${to}=X` ``
  - `toAccountCurrency(series: Record<ISODate, number>, fx: Record<ISODate, number> | null): Record<ISODate, number>` — multiplies each value by `priceOn(fx, date)`; `fx === null` means same currency.
- `YahooChartResult` gains `events?: { splits?: Record<string, { date: number; numerator: number; denominator: number }> }`.

- [ ] **Step 1: Write the failing tests**

```ts
// dates.test.ts
expect(eachDay('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
expect(rangeStartDate('1Y', '2026-11-22', '2020-01-01')).toBe('2025-11-22');
expect(rangeStartDate('YTD', '2026-11-22', '2020-01-01')).toBe('2026-01-01');
expect(rangeStartDate('1Y', '2026-11-22', '2026-06-01')).toBe('2026-06-01');
expect(rangeStartDate('ALL', '2026-11-22', '2021-03-05')).toBe('2021-03-05');

// price-history.test.ts
it('normalizes GBp to GBP', () => {
  const s = parseDailyHistory(yahoo({ currency: 'GBp', ts: [day('2024-01-02')], close: [8000], adj: [7900] }));
  expect(s.currency).toBe('GBP'); expect(s.closes['2024-01-02']).toBe(80); expect(s.adjCloses['2024-01-02']).toBe(79);
});
it('skips null closes and reads splits', () => {
  const s = parseDailyHistory(yahoo({ currency: 'USD', ts: [day('2024-01-02'), day('2024-01-03')], close: [10, null], adj: [10, null],
    splits: { x: { date: day('2024-06-10'), numerator: 4, denominator: 1 } } }));
  expect(Object.keys(s.closes)).toEqual(['2024-01-02']); expect(s.splits).toEqual([{ date: '2024-06-10', ratio: 4 }]);
});
it('priceOn carries forward and back-fills before first point', () => {
  const p = { '2024-01-05': 10, '2024-01-08': 12 };
  expect(priceOn(p, '2024-01-07')).toBe(10); expect(priceOn(p, '2024-01-01')).toBe(10); expect(priceOn({}, '2024-01-01')).toBeNull();
});
it('toAccountCurrency multiplies by carried-forward fx', () => {
  expect(toAccountCurrency({ '2024-01-06': 100 }, { '2024-01-05': 1.2 })).toEqual({ '2024-01-06': 120 });
});
```
(`day(iso)` → unix seconds at 14:30 UTC; `yahoo()` builds a `YahooChartResponse`. Missing `adjclose` falls back to `close`.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/dates.test.ts src/lib/price-history.test.ts`, FAIL.
- [ ] **Step 3: Implement** the functions above. Timestamps → ISO date via UTC.
- [ ] **Step 4: Verify** — `npx vitest run && npx tsc -b`, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: add date helpers and Yahoo daily history parsing"`

---

### Task 3: Account reconstruction

**Files:**
- Create: `src/lib/portfolio-reconstruction.ts`
- Test: `src/lib/portfolio-reconstruction.test.ts`

**Interfaces:**
- Consumes: `priceOn`, `eachDay` (Task 2); types (Task 1).
- Produces:
  ```ts
  export interface ReconstructionInput {
    events: HistoryEvents;
    accountCurrency: string;
    prices: Record<string, PriceSeries>;              // keyed by T212 ticker; missing = unpriceable
    fx: Record<string, Record<ISODate, number>>;      // keyed by foreign currency → rate to account currency
    today: ISODate;
  }
  export function reconstructAccount(input: ReconstructionInput): ReconstructionResult;
  ```

Rules the tests pin:
- Day range: earliest event date → `today`.
- Cash = Σ cash-flow amounts (converted with `fx[currency]` if ≠ account currency) + Σ fill `cashImpact`.
- Fills with `fillType === 'STOCK_SPLIT'` are ignored. Every other fill's quantity is multiplied by the product of `ratio` of that ticker's splits dated **after** the fill date (puts quantities on Yahoo's split-adjusted basis).
- Holding value = adjusted qty × `priceOn(closes, d)` × `priceOn(fx[series.currency], d)` (1 if account currency).
- Unpriceable ticker (no series or empty closes): value at last fill's `|cashImpact / quantity|` (already account currency) carried forward; ticker listed in `unpricedTickers` if held on `today`.
- `netDeposited` = cumulative external flow amounts; `externalFlows` = external flows in account currency.
- `holdingsToday` = adjusted quantities ≠ 0 on `today`; `valueToday` = last point's value.

- [ ] **Step 1: Write the failing tests**

```ts
it('cash + holdings in account currency', () => {
  const r = reconstructAccount(input({ ccy: 'USD',
    flows: [dep('2024-01-01', 1000)], fills: [buy('2024-01-02', 'AAPL', 10, 500)],
    prices: { AAPL: series('USD', { '2024-01-02': 50, '2024-01-03': 60 }) }, today: '2024-01-03' }));
  expect(r.points.map((p) => p.value)).toEqual([1000, 1000, 1100]);
  expect(r.points.at(-1)!.netDeposited).toBe(1000);
});
it('no jump across a split', () => {
  // bought 1 share for 100 before a 2:1 split; Yahoo adjusted closes are 50 throughout
  const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 100)], fills: [buy('2024-01-01', 'X', 1, 100), splitFill('2024-01-03', 'X', 1)],
    prices: { X: series('USD', { '2024-01-01': 50, '2024-01-04': 50 }, [{ date: '2024-01-03', ratio: 2 }]) }, today: '2024-01-04' }));
  expect(r.points.map((p) => p.value)).toEqual([100, 100, 100, 100]);
  expect(r.holdingsToday).toEqual({ X: 2 });
});
it('converts foreign holdings with fx', () => {
  const r = reconstructAccount(input({ ccy: 'EUR', flows: [dep('2024-01-01', 1000)], fills: [buy('2024-01-01', 'AAPL', 10, 900)],
    prices: { AAPL: series('USD', { '2024-01-01': 100 }) }, fx: { USD: { '2024-01-01': 0.9 } }, today: '2024-01-01' }));
  expect(r.valueToday).toBeCloseTo(100 + 900);
});
it('unpriceable ticker valued at last fill cost and reported', () => {
  const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 500)], fills: [buy('2024-01-01', 'GONE', 5, 250)], prices: {}, today: '2024-01-02' }));
  expect(r.valueToday).toBe(500); expect(r.unpricedTickers).toEqual(['GONE']);
});
it('withdrawals reduce netDeposited and appear as negative external flows', () => {
  const r = reconstructAccount(input({ ccy: 'USD', flows: [dep('2024-01-01', 1000), wd('2024-01-02', 300)], fills: [], prices: {}, today: '2024-01-02' }));
  expect(r.points.at(-1)).toMatchObject({ value: 700, netDeposited: 700 });
  expect(r.externalFlows).toEqual([{ date: '2024-01-01', amount: 1000 }, { date: '2024-01-02', amount: -300 }]);
});
```

- [ ] **Step 2: Run to verify failure** — FAIL.
- [ ] **Step 3: Implement `reconstructAccount`** — single forward pass over `eachDay`, applying that day's events then valuing.
- [ ] **Step 4: Verify** — `npx vitest run && npx tsc -b`, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: reconstruct daily account value from T212 history"`

---

### Task 4: Benchmark simulation

**Files:**
- Create: `src/lib/benchmark-simulation.ts`, `src/lib/benchmarks.ts`
- Test: `src/lib/benchmark-simulation.test.ts`

**Interfaces:**
- Consumes: `priceOn`, `eachDay` (Task 2).
- Produces:
  ```ts
  export interface BenchmarkInput { flows: ExternalFlow[]; prices: Record<ISODate, number>; // adjclose already in account currency
    startDate: ISODate; endDate: ISODate; seedValue: number }
  export function simulateBenchmark(input: BenchmarkInput): BenchmarkResult;
  // benchmarks.ts
  export const BENCHMARKS: { id: string; label: string }[]; // ids/labels exactly as in Global Constraints
  export const DEFAULT_BENCHMARK_ID = 'VUSA.L';
  ```
Rules: on `startDate` buy `seedValue / priceOn(prices, startDate)` units; then for each day, flows dated that day buy (positive) or sell (negative) at `priceOn(prices, d)`; flows before `startDate` or after `endDate` are ignored; flows on `startDate` are applied after the seed. A sell larger than holdings sets units to 0 and records the **first** shortfall `{ date, amount: uncovered account-currency amount }`.

- [ ] **Step 1: Write the failing tests**

```ts
const P = { '2024-01-01': 100, '2024-01-02': 110, '2024-01-05': 120 }; // 03–04 weekend
it('deposit buys units', () => {
  const r = simulateBenchmark({ flows: [{ date: '2024-01-01', amount: 1000 }], prices: P, startDate: '2024-01-01', endDate: '2024-01-02', seedValue: 0 });
  expect(r.points.map((p) => p.value)).toEqual([1000, 1100]);
});
it('weekend deposit uses last price', () => {
  const r = simulateBenchmark({ flows: [{ date: '2024-01-03', amount: 110 }], prices: P, startDate: '2024-01-01', endDate: '2024-01-05', seedValue: 0 });
  expect(r.points.at(-1)!.value).toBeCloseTo(120);
});
it('seeds at range start and ignores earlier flows', () => {
  const r = simulateBenchmark({ flows: [{ date: '2024-01-01', amount: 999 }], prices: P, startDate: '2024-01-02', endDate: '2024-01-05', seedValue: 1100 });
  expect(r.points[0]).toEqual({ date: '2024-01-02', value: 1100 }); expect(r.points.at(-1)!.value).toBeCloseTo(1200);
});
it('oversized withdrawal clamps at zero and records shortfall', () => {
  const r = simulateBenchmark({ flows: [{ date: '2024-01-01', amount: 1000 }, { date: '2024-01-02', amount: -1500 }], prices: P, startDate: '2024-01-01', endDate: '2024-01-05', seedValue: 0 });
  expect(r.points.at(-1)!.value).toBe(0); expect(r.shortfall).toEqual({ date: '2024-01-02', amount: 400 });
});
it('flow before first available price buys at first price', () => {
  const r = simulateBenchmark({ flows: [{ date: '2023-12-29', amount: 100 }], prices: P, startDate: '2023-12-29', endDate: '2024-01-01', seedValue: 0 });
  expect(r.points.at(-1)!.value).toBeCloseTo(100);
});
```

- [ ] **Step 2: Run to verify failure** — FAIL.
- [ ] **Step 3: Implement** `simulateBenchmark` and `benchmarks.ts`.
- [ ] **Step 4: Verify** — `npx vitest run && npx tsc -b`, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: simulate benchmark account from external cash flows"`

---

### Task 5: T212 history sync into IndexedDB

**Files:**
- Modify: `src/services/trading212.ts`
- Create: `src/services/history-db.ts`, `src/lib/history-merge.ts`, `src/services/history-sync.ts`
- Test: `src/lib/history-merge.test.ts`

**Interfaces:**
- Consumes: normalizers and types (Task 1).
- Produces:
  - `trading212.getHistoryPage<T>(endpoint: 'orders' | 'transactions' | 'dividends', nextPagePath?: string): Promise<T212PaginatedResponse<T>>` — first page `/equity/history/<endpoint>?limit=50`; later pages use `nextPagePath` with a leading `/api/v0` stripped.
  - `idbGet<T>(key: string): Promise<T | undefined>`, `idbSet(key: string, value: unknown): Promise<void>` — DB `t212-history`, store `kv`, version 1.
  - `mergePage<T>(knownIds: Set<string>, page: T[], idOf: (item: T) => string): { fresh: T[]; reachedKnown: boolean }`
  - `syncHistory(onProgress: (message: string) => void): Promise<HistoryEvents>` — keys `events:fills`, `events:cashflows`.

- [ ] **Step 1: Write the failing test** (`history-merge.test.ts`)

```ts
const id = (x: { id: string }) => x.id;
expect(mergePage(new Set(['c']), [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], id)).toEqual({ fresh: [{ id: 'a' }, { id: 'b' }], reachedKnown: true });
expect(mergePage(new Set(), [{ id: 'a' }], id)).toEqual({ fresh: [{ id: 'a' }], reachedKnown: false });
expect(mergePage(new Set(['a']), [{ id: 'a' }], id)).toEqual({ fresh: [], reachedKnown: true });
```

- [ ] **Step 2: Run to verify failure** — FAIL.
- [ ] **Step 3: Implement**
  - `mergePage`: stop at the first known id (pages are newest-first).
  - `getHistoryPage` through `fetchT212`. Change the three `/equity/history/*` rate rules to `maxRequests: 20, periodMs: 60_000` (documented limit).
  - `history-db.ts`: promise wrapper over `indexedDB.open` / one readwrite transaction per call.
  - `syncHistory`: for each endpoint, normalize each page, `mergePage` against stored ids, keep paging while `!reachedKnown && nextPagePath`; append fresh events; save; progress text like `"Fetching orders… page 3"`. Return all events.
- [ ] **Step 4: Verify** — `npx vitest run && npx tsc -b && npm run lint`, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: incremental T212 history sync into IndexedDB"`

---

### Task 6: Cached Yahoo daily history

**Files:**
- Modify: `src/services/yahoo-finance.ts`
- Create: `src/services/price-history-cache.ts`

**Interfaces:**
- Consumes: `parseDailyHistory` (Task 2), `idbGet/idbSet` (Task 5).
- Produces:
  - `yahooFinance.getDailyHistory(symbol: string, from: ISODate, to: ISODate): Promise<PriceSeries>` — `/api/yahoo/v8/finance/chart/<symbol>?interval=1d&period1=<unix>&period2=<unix>&events=div|split`, through `yahooConnection`. `symbol` is already a Yahoo symbol.
  - `loadPriceSeries(symbol: string, from: ISODate): Promise<PriceSeries | null>` — cache key `price:<symbol>` storing `{ series, fetchedAt }`. Cached, covers `from`, fetched < 12 h ago → return. Cached and covers `from` → fetch from (last cached date − 7 days) to today and merge. Otherwise full fetch. Yahoo error / empty → `null` (caller treats as unpriceable).

- [ ] **Step 1: Implement** both functions.
- [ ] **Step 2: Verify** — `npx tsc -b && npm run lint`, PASS. (Network path is verified end-to-end in Task 7.)
- [ ] **Step 3: Commit** — `git commit -m "feat: cached Yahoo daily price history"`

---

### Task 7: Hook, card, and Dashboard integration

**Files:**
- Create: `src/hooks/use-portfolio-history.ts`, `src/components/dashboard/portfolio-benchmark-chart.tsx`
- Modify: `src/pages/dashboard.tsx`

**Interfaces:**
- Consumes: everything above; `resolveYahooTicker` from `@/services/yahoo-finance`; `useAppContext()`.
- Produces:
  ```ts
  export function usePortfolioHistory(accountCurrency: string, benchmarkId: string): {
    status: 'idle' | 'syncing' | 'ready' | 'error'; progress: string; error: string | null;
    reconstruction: ReconstructionResult | null;
    benchmarkPrices: Record<ISODate, number> | null; // adjclose in account currency
    refresh: () => void;
  };
  export function PortfolioBenchmarkChart(props: { accountCurrency: string; liveTotal: number | null; livePositions: T212Position[] }): JSX.Element;
  ```

- [ ] **Step 1: Implement the hook**

Sequence: `syncHistory` → distinct fill tickers → `loadPriceSeries(resolveYahooTicker(t), firstDate)` each (progress `"Loading prices 4/17"`) → distinct non-account currencies from series and cash flows → `loadPriceSeries(fxSymbol(c, accountCurrency), firstDate)` → `reconstructAccount` → benchmark series `toAccountCurrency(adjCloses, fx)`. Changing `benchmarkId` reloads only the benchmark. Runs on mount and on `refresh()`; skip when `accountCurrency` not yet known.

- [ ] **Step 2: Implement the card**

Layout and copy per the spec's UI sketch: title "Portfolio vs benchmark", range buttons `1M 3M YTD 1Y All`, refresh button, benchmark `Select` from `BENCHMARKS`, three `LineSeries` — "My account", "If invested in <short label>", "Net deposited" (dotted). Per range: `start = rangeStartDate(...)`; slice points; `simulateBenchmark({ flows: externalFlows, prices: benchmarkPrices, startDate: start, endDate: today, seedValue: <account value on start, 0 for ALL> })`; "Net deposited" in-range starts from the seed. Crosshair tooltip shows both values and difference for the hovered day. Footer: my value · benchmark value · Δ (abs and %) · deposited in range · accuracy line `Reconstruction within X% of live value` against `liveTotal` — destructive styling when |X| > 2%. Alerts: unpriced tickers (link to `/settings`), tickers where `|holdingsToday − live quantity| > 0.0001`, benchmark shortfall note `Benchmark account emptied on <date>; <amount> of the withdrawal couldn't be covered`. During sync show `progress` instead of the chart. Follow theme handling in `candlestick-chart.tsx`.

- [ ] **Step 3: Mount** below `<AccountSummary>` in `src/pages/dashboard.tsx`, passing `accountCurrency`, `cash?.total ?? null`, `positions`.

- [ ] **Step 4: Verify build** — `npx vitest run && npm run build && npm run lint`, all PASS.

- [ ] **Step 5: Verify in the browser** — `npm run dev`, open the Dashboard with live credentials: first sync shows progress then the chart; reload is near-instant; range buttons re-seed the benchmark; switching benchmark redraws; accuracy line is shown. Record the accuracy %, unpriced and mismatched tickers in the PR/summary.

- [ ] **Step 6: Commit** — `git commit -m "feat: portfolio vs benchmark chart on dashboard"`
