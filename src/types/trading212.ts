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
  shortname: string;
  addedOn: string;
  maxOpenQuantity: number;
  minTradeQuantity: number;
  workingScheduleId: number;
}

export interface T212HistoryItem {
  executor: string;
  ticker: string;
  quantity: number;
  price: number;
  dateExecuted: string;
  dateCreated: string;
  dateModified: string;
  orderId: number;
  type: string;
  fillResult: number;
  fillPrice: number;
  fillQuantity: number;
  fillCost: number;
  fillType: string;
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
