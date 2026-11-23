export type ISODate = string; // YYYY-MM-DD

export type CashFlowKind = 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'interest' | 'dividend' | 'other';

export interface CashFlow {
  id: string;
  date: ISODate;
  kind: CashFlowKind;
  amount: number;
  currency: string;
  external: boolean;
}

export interface Fill {
  id: string;
  date: ISODate;
  ticker: string;
  quantity: number;
  cashImpact: number;
  fillType: string;
}

export interface HistoryEvents {
  fills: Fill[];
  cashFlows: CashFlow[];
}

export interface PriceSeries {
  symbol: string;
  currency: string;
  closes: Record<ISODate, number>;
  adjCloses: Record<ISODate, number>;
  splits: { date: ISODate; ratio: number }[];
}

export interface AccountPoint {
  date: ISODate;
  value: number;
  netDeposited: number;
}

export interface ExternalFlow {
  date: ISODate;
  amount: number; // account currency, signed
}

export interface ReconstructionResult {
  points: AccountPoint[];
  externalFlows: ExternalFlow[];
  unpricedTickers: string[];
  holdingsToday: Record<string, number>;
  valueToday: number;
}

export interface BenchmarkPoint {
  date: ISODate;
  value: number;
}

export interface BenchmarkResult {
  points: BenchmarkPoint[];
  shortfall: { date: ISODate; amount: number } | null;
}

export type HistoryRange = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';
