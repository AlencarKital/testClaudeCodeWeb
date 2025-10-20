import { useState, useEffect } from 'react';
import type { Stock, AvailableStock } from '../types/stock';
import { formatMarketCap } from '../data/stocks';

export const useStockData = (availableStocks: AvailableStock[], selectedSymbols: string[]) => {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    // Initialize stocks with base data
    const initialStocks = selectedSymbols.map(symbol => {
      const stockInfo = availableStocks.find(s => s.symbol === symbol);
      if (!stockInfo) return null;

      const randomChange = (Math.random() - 0.5) * 10;
      const changePercent = (randomChange / stockInfo.initialPrice) * 100;

      return {
        symbol: stockInfo.symbol,
        name: stockInfo.name,
        price: stockInfo.initialPrice + randomChange,
        change: randomChange,
        changePercent: changePercent,
        volume: Math.floor(Math.random() * 100000000),
        marketCap: formatMarketCap(stockInfo.initialPrice),
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

          return {
            ...stock,
            price: newPrice,
            change: totalChange,
            changePercent: changePercent,
            volume: stock.volume + Math.floor(Math.random() * 1000000),
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [availableStocks, selectedSymbols]);

  return stocks;
};
