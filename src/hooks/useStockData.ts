import { useState, useEffect } from 'react';
import type { Stock, AvailableStock, TimePeriod } from '../types/stock';
import { formatMarketCap } from '../data/stocks';
// Finnhub: cotações em tempo real com rate limit melhor (60/min vs 5/min)
import { fetchQuote } from '../services/finnhub';
// Yahoo Finance: dados históricos sem limites rígidos
import { fetchHistoricalData as fetchYahooHistoricalData } from '../services/yahooFinance';
// Supabase: cache dos dados históricos
import { getOrFetchData } from '../services/supabaseCache';

// Update interval for real-time quotes (30 seconds to respect API limits)
const QUOTE_UPDATE_INTERVAL = 30000; // 30 seconds

export const useStockData = (availableStocks: AvailableStock[], selectedSymbols: string[]) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let quoteInterval: ReturnType<typeof setInterval>;
    let isMounted = true;

    // Função para buscar cotação atual de um símbolo
    const fetchStockQuote = async (symbol: string, stockInfo: AvailableStock): Promise<Partial<Stock> | null> => {
      try {
        console.log(`[useStockData] Iniciando busca de cotação para ${symbol}...`);
        const quote = await fetchQuote(symbol);

        console.log(`[useStockData] Cotação de ${symbol} obtida: $${quote.price} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)`);

        return {
          symbol: stockInfo.symbol,
          name: stockInfo.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          volume: Math.floor(Math.random() * 100000000), // API gratuita não fornece volume em tempo real
          marketCap: formatMarketCap(quote.price),
          dayHigh: quote.dayHigh,
          dayLow: quote.dayLow,
        };
      } catch (err) {
        console.error(`[useStockData] ❌ Erro ao buscar cotação de ${symbol}:`, err);
        return null;
      }
    };

    // Função para buscar histórico de um símbolo para um período
    // Usa Yahoo Finance com cache do Supabase
    const fetchStockHistory = async (
      symbol: string,
      period: TimePeriod
    ): Promise<{ timestamp: number; price: number }[]> => {
      try {
        console.log(`[useStockData] Buscando histórico ${period} para ${symbol}...`);
        // Tenta buscar do cache primeiro, senão busca do Yahoo Finance
        const data = await getOrFetchData(symbol, period, () => fetchYahooHistoricalData(symbol, period));
        console.log(`[useStockData] Histórico ${period} de ${symbol}: ${data.length} pontos obtidos`);
        return data;
      } catch (err) {
        console.error(`[useStockData] ❌ Erro ao buscar histórico ${period} de ${symbol}:`, err);
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
          dayHigh: quoteData.dayHigh!,
          dayLow: quoteData.dayLow!,
          priceHistory,
        };
      } catch (err) {
        console.error(`Erro ao buscar dados completos de ${symbol}:`, err);
        return null;
      }
    };

    // Função para inicializar dados
    const initializeStocks = async () => {
      console.log(`[useStockData] 🚀 Inicializando dados para ${selectedSymbols.length} ações: ${selectedSymbols.join(', ')}`);
      setLoading(true);
      setError(null);

      try {
        const stockPromises = selectedSymbols.map(symbol => fetchCompleteStockData(symbol));
        const results = await Promise.all(stockPromises);
        const validStocks = results.filter(Boolean) as Stock[];

        console.log(`[useStockData] ✅ ${validStocks.length} de ${selectedSymbols.length} ações carregadas com sucesso`);

        if (validStocks.length === 0) {
          throw new Error('Não foi possível carregar dados de nenhuma ação. Verifique os logs acima para detalhes.');
        }

        if (isMounted) {
          setStocks(validStocks);
          setLoading(false);
        }
      } catch (err) {
        console.error('[useStockData] ❌ Erro ao inicializar ações:', err);
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
              prevStocks.map(s => {
                if (s.symbol === stock.symbol) {
                  const previousPrice = s.price;
                  const newPrice = quoteData.price!;
                  let priceDirection: 'up' | 'down' | 'neutral' = 'neutral';

                  if (newPrice > previousPrice) {
                    priceDirection = 'up';
                  } else if (newPrice < previousPrice) {
                    priceDirection = 'down';
                  }

                  return {
                    ...s,
                    previousPrice,
                    price: newPrice,
                    change: quoteData.change!,
                    changePercent: quoteData.changePercent!,
                    marketCap: quoteData.marketCap!,
                    dayHigh: quoteData.dayHigh!,
                    dayLow: quoteData.dayLow!,
                    volume: s.volume + Math.floor(Math.random() * 1000000),
                    priceDirection,
                  };
                }
                return s;
              })
            );
          }

          // Delay entre atualizações para respeitar rate limit
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error('Erro ao atualizar cotações:', err);
      }
    };

    // Nota: Não precisamos mais de updateHistoricals()
    // Os dados históricos são gerenciados pelo cache do Supabase
    // e só são atualizados quando o cache expira (conforme TTL definido)

    // Inicializar dados
    initializeStocks();

    // Configurar intervalo de atualização apenas para cotações em tempo real
    quoteInterval = setInterval(() => {
      updateQuotes();
    }, QUOTE_UPDATE_INTERVAL);

    // Cleanup
    return () => {
      isMounted = false;
      if (quoteInterval) clearInterval(quoteInterval);
    };
  }, [availableStocks, selectedSymbols]);

  return { stocks, loading, error };
};
