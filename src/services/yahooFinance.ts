import axios from 'axios';
import type { PricePoint, TimePeriod } from '../types/stock';

// Yahoo Finance API via query1.finance.yahoo.com
// Este endpoint é público e não requer API key
const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        currency: string;
        regularMarketPrice: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: number[];
          high: number[];
          low: number[];
          open: number[];
          volume: number[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

// Mapeamento de períodos para intervalos do Yahoo Finance
const PERIOD_CONFIG: Record<TimePeriod, { range: string; interval: string }> = {
  '15min': { range: '1d', interval: '15m' },
  '1h': { range: '1d', interval: '60m' },
  '1d': { range: '5d', interval: '1d' },
  '5d': { range: '5d', interval: '1d' },
  '1m': { range: '1mo', interval: '1d' },
  '3m': { range: '3mo', interval: '1d' },
  '6m': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' },
};

/**
 * Busca dados históricos do Yahoo Finance
 * @param symbol - Símbolo da ação (ex: AAPL, GOOGL)
 * @param period - Período desejado
 * @returns Array de pontos de preço
 */
export async function fetchHistoricalData(
  symbol: string,
  period: TimePeriod
): Promise<PricePoint[]> {
  try {
    const config = PERIOD_CONFIG[period];
    const url = `${BASE_URL}/${symbol}`;

    const response = await axios.get<YahooChartResponse>(url, {
      params: {
        range: config.range,
        interval: config.interval,
        includePrePost: false,
      },
      timeout: 10000, // 10 segundos timeout
    });

    const result = response.data.chart.result?.[0];

    if (!result || response.data.chart.error) {
      console.error(`Yahoo Finance API error for ${symbol}:`, response.data.chart.error);
      return [];
    }

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;

    if (!timestamps || !prices) {
      console.warn(`No data available for ${symbol} (${period})`);
      return [];
    }

    // Converter para formato PricePoint e filtrar valores null
    const pricePoints: PricePoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const price = prices[i];
      if (price !== null && price !== undefined) {
        pricePoints.push({
          timestamp: timestamps[i] * 1000, // Converter para milissegundos
          price: Number(price.toFixed(2)),
        });
      }
    }

    return pricePoints;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Yahoo Finance fetch error for ${symbol}:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
    } else {
      console.error(`Unexpected error fetching ${symbol}:`, error);
    }
    return [];
  }
}

/**
 * Busca dados históricos para múltiplos símbolos em paralelo
 * @param symbols - Array de símbolos
 * @param period - Período desejado
 * @returns Map de símbolo para array de pontos de preço
 */
export async function fetchMultipleHistoricalData(
  symbols: string[],
  period: TimePeriod
): Promise<Map<string, PricePoint[]>> {
  const results = new Map<string, PricePoint[]>();

  // Buscar todos em paralelo com delay entre requisições para evitar rate limiting
  const promises = symbols.map((symbol, index) =>
    new Promise<void>((resolve) => {
      // Delay de 100ms entre cada requisição para não sobrecarregar
      setTimeout(async () => {
        const data = await fetchHistoricalData(symbol, period);
        results.set(symbol, data);
        resolve();
      }, index * 100);
    })
  );

  await Promise.all(promises);
  return results;
}

/**
 * Verifica se o Yahoo Finance está disponível
 * @returns true se disponível
 */
export async function checkYahooFinanceHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${BASE_URL}/AAPL`, {
      params: { range: '1d', interval: '1d' },
      timeout: 5000,
    });
    return response.status === 200 && !response.data.chart.error;
  } catch (error) {
    console.error('Yahoo Finance health check failed:', error);
    return false;
  }
}
