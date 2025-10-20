export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
}

export interface AvailableStock {
  symbol: string;
  name: string;
  initialPrice: number;
}
