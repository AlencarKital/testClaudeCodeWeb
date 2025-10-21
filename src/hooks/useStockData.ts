import { useState, useEffect } from 'react';
import type { Stock, AvailableStock } from '../types/stock';
import { formatMarketCap } from '../data/stocks';

// Store historical data (max 1 year worth of 3-second updates)
const MAX_HISTORY_POINTS = 10512000; // ~1 year in 3-second intervals

// Generate historical price data for a given time period
const generateHistoricalData = (basePrice: number, periodMinutes: number): { timestamp: number; price: number }[] => {
  const now = Date.now();
  const intervalMs = 3000; // 3 seconds between data points
  const totalPoints = Math.floor((periodMinutes * 60 * 1000) / intervalMs);
  const history: { timestamp: number; price: number }[] = [];

  // Start from the oldest point and work forward
  let currentPrice = basePrice * (0.85 + Math.random() * 0.3); // Start within 15% of base price

  for (let i = 0; i < totalPoints; i++) {
    const timestamp = now - (totalPoints - i) * intervalMs;

    // Simulate realistic price movements with trend and volatility
    const trendTowardBase = (basePrice - currentPrice) * 0.0001; // Slight pull toward base price
    const randomWalk = (Math.random() - 0.5) * basePrice * 0.005; // Random movement
    currentPrice = Math.max(0.01, currentPrice + trendTowardBase + randomWalk);

    history.push({ timestamp, price: currentPrice });
  }

  return history;
};

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

      // Generate 1 year of historical data
      const historicalData = generateHistoricalData(stockInfo.initialPrice, 525600); // 1 year in minutes

      // Add current price point
      historicalData.push({ timestamp: currentTime, price: currentPrice });

      return {
        symbol: stockInfo.symbol,
        name: stockInfo.name,
        price: currentPrice,
        change: randomChange,
        changePercent: changePercent,
        volume: Math.floor(Math.random() * 100000000),
        marketCap: formatMarketCap(stockInfo.initialPrice),
        priceHistory: historicalData,
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
