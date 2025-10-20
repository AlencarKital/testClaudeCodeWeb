import type { AvailableStock } from '../types/stock';

export const AVAILABLE_STOCKS: AvailableStock[] = [
  { symbol: 'TSLA', name: 'Tesla Inc.', initialPrice: 242.84 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', initialPrice: 178.25 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', initialPrice: 163.57 },
  { symbol: 'AAPL', name: 'Apple Inc.', initialPrice: 229.87 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', initialPrice: 138.07 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', initialPrice: 416.56 },
  { symbol: 'META', name: 'Meta Platforms Inc.', initialPrice: 567.33 },
  { symbol: 'NFLX', name: 'Netflix Inc.', initialPrice: 701.35 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', initialPrice: 143.89 },
  { symbol: 'INTC', name: 'Intel Corporation', initialPrice: 22.45 },
];

export const DEFAULT_SELECTED_SYMBOLS = ['TSLA', 'AMZN', 'GOOGL', 'AAPL', 'NVDA', 'MSFT'];

export const formatMarketCap = (price: number): string => {
  // Simplified market cap estimation based on price
  const cap = price * 1000000000; // Simplified calculation
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
  return `$${(cap / 1e6).toFixed(2)}M`;
};
