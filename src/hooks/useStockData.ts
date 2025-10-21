import { useState, useEffect } from 'react';
import type { Stock, AvailableStock } from '../types/stock';
import { formatMarketCap } from '../data/stocks';

// Configuration for each time period (Robinhood-style optimization)
const PERIOD_CONFIGS = {
  '15min': { minutes: 15, intervalMs: 15000, maxPoints: 60 },        // 15s intervals
  '1h': { minutes: 60, intervalMs: 60000, maxPoints: 60 },           // 1min intervals
  '1d': { minutes: 390, intervalMs: 60000, maxPoints: 390 },         // 1min intervals (6.5h market)
  '5d': { minutes: 1950, intervalMs: 300000, maxPoints: 390 },       // 5min intervals
  '1m': { minutes: 7800, intervalMs: 3600000, maxPoints: 130 },      // 1h intervals (~30 days)
  '3m': { minutes: 23400, intervalMs: 7200000, maxPoints: 270 },     // 2h intervals (~90 days)
  '6m': { minutes: 46800, intervalMs: 86400000, maxPoints: 180 },    // 1 day intervals (~180 days)
  '1y': { minutes: 93600, intervalMs: 86400000, maxPoints: 365 },    // 1 day intervals (365 days)
};

// Real-time update interval
const REALTIME_UPDATE_INTERVAL = 3000; // 3 seconds

// Generate optimized historical data for multiple periods
const generateOptimizedHistoricalData = (basePrice: number): Map<string, { timestamp: number; price: number }[]> => {
  const historicalData = new Map<string, { timestamp: number; price: number }[]>();
  const now = Date.now();

  // Generate data for each period
  Object.entries(PERIOD_CONFIGS).forEach(([period, config]) => {
    const history: { timestamp: number; price: number }[] = [];
    let currentPrice = basePrice * (0.85 + Math.random() * 0.3);

    for (let i = 0; i < config.maxPoints; i++) {
      const timestamp = now - (config.maxPoints - i) * config.intervalMs;

      // Simulate realistic price movements
      const trendTowardBase = (basePrice - currentPrice) * 0.0001;
      const randomWalk = (Math.random() - 0.5) * basePrice * 0.005;
      currentPrice = Math.max(0.01, currentPrice + trendTowardBase + randomWalk);

      history.push({ timestamp, price: currentPrice });
    }

    historicalData.set(period, history);
  });

  return historicalData;
};

// Helper to downsample real-time data to appropriate interval for a period
const downsampleData = (
  realtimeData: { timestamp: number; price: number }[],
  config: { intervalMs: number; maxPoints: number }
): { timestamp: number; price: number }[] => {
  if (realtimeData.length === 0) return [];

  const result: { timestamp: number; price: number }[] = [];
  const now = Date.now();
  const periodStartTime = now - config.maxPoints * config.intervalMs;

  // Group real-time data by interval buckets
  for (let i = 0; i < config.maxPoints; i++) {
    const bucketStartTime = periodStartTime + i * config.intervalMs;
    const bucketEndTime = bucketStartTime + config.intervalMs;

    // Find all points in this bucket
    const bucketPoints = realtimeData.filter(
      point => point.timestamp >= bucketStartTime && point.timestamp < bucketEndTime
    );

    // Use the last point in the bucket (most recent price)
    if (bucketPoints.length > 0) {
      result.push(bucketPoints[bucketPoints.length - 1]);
    }
  }

  return result;
};

export const useStockData = (availableStocks: AvailableStock[], selectedSymbols: string[]) => {
  const [stocks, setStocks] = useState<Stock[]>([]);

  useEffect(() => {
    // Initialize stocks with optimized historical data
    const initialStocks = selectedSymbols.map(symbol => {
      const stockInfo = availableStocks.find(s => s.symbol === symbol);
      if (!stockInfo) return null;

      const randomChange = (Math.random() - 0.5) * 10;
      const changePercent = (randomChange / stockInfo.initialPrice) * 100;
      const currentPrice = stockInfo.initialPrice + randomChange;

      // Generate optimized historical data for all periods
      const historicalData = generateOptimizedHistoricalData(stockInfo.initialPrice);

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

    // Store real-time data for downsampling (keep last 24 hours at 3-second intervals = ~28800 points)
    const realtimeDataStore = new Map<string, { timestamp: number; price: number }[]>();
    const MAX_REALTIME_POINTS = 28800; // 24 hours worth

    initialStocks.forEach(stock => {
      realtimeDataStore.set(stock.symbol, []);
    });

    // Update stock prices every 3 seconds
    const interval = setInterval(() => {
      setStocks(prevStocks =>
        prevStocks.map(stock => {
          const priceChange = (Math.random() - 0.5) * 2;
          const newPrice = Math.max(0.01, stock.price + priceChange);
          const stockInfo = availableStocks.find(s => s.symbol === stock.symbol);
          const totalChange = stockInfo ? newPrice - stockInfo.initialPrice : 0;
          const changePercent = stockInfo ? (totalChange / stockInfo.initialPrice) * 100 : 0;
          const currentTime = Date.now();

          // Add to real-time data store
          const realtimeData = realtimeDataStore.get(stock.symbol) || [];
          realtimeData.push({ timestamp: currentTime, price: newPrice });

          // Trim real-time data to max points
          if (realtimeData.length > MAX_REALTIME_POINTS) {
            realtimeData.splice(0, realtimeData.length - MAX_REALTIME_POINTS);
          }
          realtimeDataStore.set(stock.symbol, realtimeData);

          // Update period-specific histories by downsampling real-time data
          const updatedHistory = new Map(stock.priceHistory);

          // For short periods (15min, 1h), use real-time data directly
          if (realtimeData.length > 0) {
            // 15min period - last 60 points at 15s intervals
            const last15min = realtimeData.filter(
              p => p.timestamp >= currentTime - PERIOD_CONFIGS['15min'].minutes * 60 * 1000
            );
            updatedHistory.set('15min', last15min.slice(-PERIOD_CONFIGS['15min'].maxPoints));

            // 1h period - downsample to 1min intervals
            const downsampled1h = downsampleData(
              realtimeData.filter(p => p.timestamp >= currentTime - PERIOD_CONFIGS['1h'].minutes * 60 * 1000),
              PERIOD_CONFIGS['1h']
            );
            updatedHistory.set('1h', downsampled1h);

            // For longer periods, downsample appropriately
            Object.entries(PERIOD_CONFIGS).forEach(([period, config]) => {
              if (period !== '15min' && period !== '1h') {
                const periodData = realtimeData.filter(
                  p => p.timestamp >= currentTime - config.minutes * 60 * 1000
                );
                if (periodData.length > 0) {
                  const downsampled = downsampleData(periodData, config);
                  if (downsampled.length > 0) {
                    const existing = updatedHistory.get(period as any) || [];
                    const combined = [...existing, ...downsampled];

                    // Remove duplicates and keep only maxPoints
                    const uniqueMap = new Map<number, number>();
                    combined.forEach(p => uniqueMap.set(p.timestamp, p.price));
                    const uniquePoints = Array.from(uniqueMap.entries())
                      .map(([timestamp, price]) => ({ timestamp, price }))
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .slice(-config.maxPoints);

                    updatedHistory.set(period as any, uniquePoints);
                  }
                }
              }
            });
          }

          return {
            ...stock,
            price: newPrice,
            change: totalChange,
            changePercent: changePercent,
            volume: stock.volume + Math.floor(Math.random() * 1000000),
            priceHistory: updatedHistory,
          };
        })
      );
    }, REALTIME_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [availableStocks, selectedSymbols]);

  return stocks;
};
