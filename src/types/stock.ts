export interface PricePoint {
  timestamp: number;
  price: number;
}

export type TimePeriod = '15min' | '1h' | '1d' | '5d' | '1m' | '3m' | '6m' | '1y';

export type PriceDirection = 'up' | 'down' | 'neutral';

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
  dayLow: number;
  dayHigh: number;
  previousPrice?: number;
  priceDirection?: PriceDirection;
  priceHistory: Map<TimePeriod, PricePoint[]>;
}

export interface AvailableStock {
  symbol: string;
  name: string;
  initialPrice: number;
}
