export interface T212Account {
  id: number;
  currencyCode: string;
}

export interface T212Cash {
  free: number;
  invested: number;
  pipiResult: number;
  result: number;
  total: number;
}

export interface T212Position {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl: number;
  initialFillDate: string;
  frontend: string;
  maxBuy: number;
  maxSell: number;
  pieQuantity: number;
}

export interface T212Instrument {
  ticker: string;
  name: string;
  type: string;
  currencyCode: string;
  isin: string;
  /** Exchange symbol, e.g. "RR" for RRl_EQ; follows renames. */
  shortName: string;
  addedOn: string;
  maxOpenQuantity: number;
  minTradeQuantity: number;
  workingScheduleId: number;
}

export interface T212OrderHistoryItem {
  order: {
    id: number;
    ticker: string;
    side: 'BUY' | 'SELL';
    status: string;
    currency: string;
    createdAt: string;
    instrument: { ticker: string; currency: string; isin: string; name: string };
  };
  fill?: {
    id: number;
    filledAt: string;
    price: number;
    quantity: number;
    type: string;
    walletImpact: {
      currency: string;
      fxRate: number;
      netValue: number;
      realisedProfitLoss: number;
      taxes: { name: string; quantity: number; currency: string; chargedAt: string }[];
    };
  };
}

export interface T212TransactionItem {
  amount: number;
  currency: string;
  dateTime: string;
  reference: string;
  type: 'WITHDRAW' | 'DEPOSIT' | 'FEE' | 'TRANSFER' | 'INTEREST_ON_FREE_CASH' | 'LENDING_INTEREST';
}

export interface T212DividendItem {
  amount: number;
  currency: string;
  paidOn: string;
  reference: string;
  ticker: string;
  quantity: number;
  type: string;
}

export interface T212PaginatedResponse<T> {
  items: T[];
  nextPagePath: string | null;
}

export interface T212Credentials {
  apiKey: string;
  apiSecret: string;
  isDemo: boolean;
}
