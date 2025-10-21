import { useState, useEffect } from 'react';
import type { Stock, AvailableStock, TimePeriod } from '../types/stock';
import { formatMarketCap } from '../data/stocks';
import { fetchQuote, fetchHistoricalData } from '../services/alphaVantage';

// Update interval for real-time quotes (30 seconds to respect API limits)
const QUOTE_UPDATE_INTERVAL = 30000; // 30 seconds

// Historical data refresh interval (5 minutes)
const HISTORICAL_REFRESH_INTERVAL = 300000; // 5 minutes

export const useStockData = (availableStocks: AvailableStock[], selectedSymbols: string[]) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let quoteInterval: ReturnType<typeof setInterval>;
    let historicalInterval: ReturnType<typeof setInterval>;
    let isMounted = true;

    // Função para buscar cotação atual de um símbolo
    const fetchStockQuote = async (symbol: string, stockInfo: AvailableStock): Promise<Partial<Stock> | null> => {
      try {
        const quote = await fetchQuote(symbol);

        return {
          symbol: stockInfo.symbol,
          name: stockInfo.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: Math.floor(Math.random() * 100000000), // API gratuita não fornece volume em tempo real
          marketCap: formatMarketCap(quote.price),
        };
      } catch (err) {
        console.error(`Erro ao buscar cotação de ${symbol}:`, err);
        return null;
      }
    };

    // Função para buscar histórico de um símbolo para um período
    const fetchStockHistory = async (
      symbol: string,
      period: TimePeriod
    ): Promise<{ timestamp: number; price: number }[]> => {
      try {
        return await fetchHistoricalData(symbol, period);
      } catch (err) {
        console.error(`Erro ao buscar histórico ${period} de ${symbol}:`, err);
        return [];
      }
    };

    // Função para buscar dados completos de um símbolo
    const fetchCompleteStockData = async (symbol: string): Promise<Stock | null> => {
      const stockInfo = availableStocks.find(s => s.symbol === symbol);
      if (!stockInfo) return null;

      try {
        // Buscar cotação atual
        const quoteData = await fetchStockQuote(symbol, stockInfo);
        if (!quoteData) return null;

        // Buscar históricos para todos os períodos
        const periods: TimePeriod[] = ['15min', '1h', '1d', '5d', '1m', '3m', '6m', '1y'];
        const priceHistory = new Map<TimePeriod, { timestamp: number; price: number }[]>();

        // Buscar períodos em sequência para evitar rate limit
        // Priorizar períodos mais curtos para visualização inicial
        const priorityPeriods: TimePeriod[] = ['1d', '1h', '5d', '1m'];

        for (const period of priorityPeriods) {
          const history = await fetchStockHistory(symbol, period);
          if (history.length > 0) {
            priceHistory.set(period, history);
          }
          // Pequeno delay entre requisições
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Buscar períodos restantes em background
        setTimeout(async () => {
          for (const period of periods) {
            if (!priorityPeriods.includes(period)) {
              const history = await fetchStockHistory(symbol, period);
              if (history.length > 0 && isMounted) {
                setStocks(prevStocks =>
                  prevStocks.map(stock => {
                    if (stock.symbol === symbol) {
                      const updatedHistory = new Map(stock.priceHistory);
                      updatedHistory.set(period, history);
                      return { ...stock, priceHistory: updatedHistory };
                    }
                    return stock;
                  })
                );
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        }, 1000);

        return {
          symbol: quoteData.symbol!,
          name: quoteData.name!,
          price: quoteData.price!,
          change: quoteData.change!,
          changePercent: quoteData.changePercent!,
          volume: quoteData.volume!,
          marketCap: quoteData.marketCap!,
          priceHistory,
        };
      } catch (err) {
        console.error(`Erro ao buscar dados completos de ${symbol}:`, err);
        return null;
      }
    };

    // Função para inicializar dados
    const initializeStocks = async () => {
      setLoading(true);
      setError(null);

      try {
        const stockPromises = selectedSymbols.map(symbol => fetchCompleteStockData(symbol));
        const results = await Promise.all(stockPromises);
        const validStocks = results.filter(Boolean) as Stock[];

        if (validStocks.length === 0) {
          throw new Error('Não foi possível carregar dados de nenhuma ação');
        }

        if (isMounted) {
          setStocks(validStocks);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao inicializar ações:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados');
          setLoading(false);
        }
      }
    };

    // Função para atualizar apenas as cotações
    const updateQuotes = async () => {
      if (stocks.length === 0) return;

      try {
        for (const stock of stocks) {
          const stockInfo = availableStocks.find(s => s.symbol === stock.symbol);
          if (!stockInfo) continue;

          const quoteData = await fetchStockQuote(stock.symbol, stockInfo);
          if (quoteData && isMounted) {
            setStocks(prevStocks =>
              prevStocks.map(s =>
                s.symbol === stock.symbol
                  ? {
                      ...s,
                      price: quoteData.price!,
                      change: quoteData.change!,
                      changePercent: quoteData.changePercent!,
                      marketCap: quoteData.marketCap!,
                      volume: s.volume + Math.floor(Math.random() * 1000000),
                    }
                  : s
              )
            );
          }

          // Delay entre atualizações para respeitar rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error('Erro ao atualizar cotações:', err);
      }
    };

    // Função para atualizar históricos
    const updateHistoricals = async () => {
      if (stocks.length === 0) return;

      try {
        const priorityPeriods: TimePeriod[] = ['1d', '1h'];

        for (const stock of stocks) {
          for (const period of priorityPeriods) {
            const history = await fetchStockHistory(stock.symbol, period);
            if (history.length > 0 && isMounted) {
              setStocks(prevStocks =>
                prevStocks.map(s => {
                  if (s.symbol === stock.symbol) {
                    const updatedHistory = new Map(s.priceHistory);
                    updatedHistory.set(period, history);
                    return { ...s, priceHistory: updatedHistory };
                  }
                  return s;
                })
              );
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (err) {
        console.error('Erro ao atualizar históricos:', err);
      }
    };

    // Inicializar dados
    initializeStocks();

    // Configurar intervalos de atualização
    quoteInterval = setInterval(() => {
      updateQuotes();
    }, QUOTE_UPDATE_INTERVAL);

    historicalInterval = setInterval(() => {
      updateHistoricals();
    }, HISTORICAL_REFRESH_INTERVAL);

    // Cleanup
    return () => {
      isMounted = false;
      if (quoteInterval) clearInterval(quoteInterval);
      if (historicalInterval) clearInterval(historicalInterval);
    };
  }, [availableStocks, selectedSymbols]);

  return { stocks, loading, error };
};
