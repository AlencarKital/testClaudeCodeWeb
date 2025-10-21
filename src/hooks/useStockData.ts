import { useState, useEffect } from 'react';
import type { Stock, AvailableStock } from '../types/stock';
import { formatMarketCap } from '../data/stocks';

// Store historical data (max 1 year worth of 3-second updates)
const MAX_HISTORY_POINTS = 10512000; // ~1 year in 3-second intervals

export const useStockData = (availableStocks: AvailableStock[], selectedSymbols: string[]) => {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    // Initialize stocks with base data
    const initialStocks = selectedSymbols.map(symbol => {
      const stockInfo = availableStocks.find(s => s.symbol === symbol);
      if (!stockInfo) return null;

      const randomChange = (Math.random() - 0.5) * 10;
      const changePercent = (randomChange / stockInfo.initialPrice) * 100;
      const currentPrice = stockInfo.initialPrice + randomChange;
      const currentTime = Date.now();

      return {
        symbol: stockInfo.symbol,
        name: stockInfo.name,
        price: currentPrice,
        change: randomChange,
        changePercent: changePercent,
        volume: Math.floor(Math.random() * 100000000),
        marketCap: formatMarketCap(stockInfo.initialPrice),
        priceHistory: [{ timestamp: currentTime, price: currentPrice }],
      };
    }).filter(Boolean) as Stock[];

    setStocks(initialStocks);

    // Update stock prices every 3 seconds to simulate real-time data
    const interval = setInterval(() => {
      setStocks(prevStocks =>
        prevStocks.map(stock => {
          const priceChange = (Math.random() - 0.5) * 2; // Random change between -1 and +1
          const newPrice = Math.max(0.01, stock.price + priceChange);
          const stockInfo = availableStocks.find(s => s.symbol === stock.symbol);
          const totalChange = stockInfo ? newPrice - stockInfo.initialPrice : 0;
          const changePercent = stockInfo ? (totalChange / stockInfo.initialPrice) * 100 : 0;
          const currentTime = Date.now();

          // Add new price point to history
          const newHistory = [...stock.priceHistory, { timestamp: currentTime, price: newPrice }];

          // Keep only the last MAX_HISTORY_POINTS to prevent memory issues
          const trimmedHistory = newHistory.length > MAX_HISTORY_POINTS
            ? newHistory.slice(-MAX_HISTORY_POINTS)
            : newHistory;

          return {
            ...stock,
            price: newPrice,
            change: totalChange,
            changePercent: changePercent,
            volume: stock.volume + Math.floor(Math.random() * 1000000),
            priceHistory: trimmedHistory,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [availableStocks, selectedSymbols]);

  return stocks;
};
