import axios from 'axios';
import type { PricePoint, TimePeriod } from '../types/stock';

// Yahoo Finance API via query1.finance.yahoo.com
// Este endpoint é público e não requer API key
// Em desenvolvimento, usa proxy do Vite para evitar CORS
// Em produção, usa proxy CORS público
const YAHOO_API_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

const BASE_URL = import.meta.env.DEV
  ? '/api/yahoo/v8/finance/chart'
  : YAHOO_API_URL;

// Proxies CORS para produção (fallback)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

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
 * Tenta fazer requisição com fallback para proxies CORS
 */
async function fetchWithCorsProxy(
  url: string,
  params: Record<string, any>,
  timeout: number
): Promise<YahooChartResponse> {
  const errors: string[] = [];

  // Em desenvolvimento, usar apenas a URL direta (proxy do Vite)
  if (import.meta.env.DEV) {
    const response = await axios.get<YahooChartResponse>(url, {
      params,
      timeout,
    });
    return response.data;
  }

  // Em produção, tentar com proxies CORS
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${queryString}`;

  // Tentar com cada proxy CORS
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(fullUrl);
      console.log(`[Yahoo Finance] Tentando com proxy: ${proxy}`);

      const response = await axios.get<YahooChartResponse>(proxyUrl, {
        timeout,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`[Yahoo Finance] ✓ Sucesso com proxy: ${proxy}`);
      return response.data;
    } catch (error) {
      const errorMsg = axios.isAxiosError(error)
        ? `${error.message} (${error.response?.status || 'network error'})`
        : String(error);
      errors.push(`${proxy}: ${errorMsg}`);
      console.warn(`[Yahoo Finance] Falha com proxy ${proxy}:`, errorMsg);
    }
  }

  // Se todos os proxies falharam, lançar erro com detalhes
  throw new Error(`Todos os proxies CORS falharam:\n${errors.join('\n')}`);
}

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
    const params = {
      range: config.range,
      interval: config.interval,
      includePrePost: false,
    };

    console.log(`[Yahoo Finance] Buscando dados históricos de ${symbol} (período: ${period})...`);

    const data = await fetchWithCorsProxy(url, params, 10000);

    const result = data.chart.result?.[0];

    if (!result || data.chart.error) {
      console.error(`[Yahoo Finance] Erro na API para ${symbol} (${period}):`, data.chart.error);
      return [];
    }

    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;

    if (!timestamps || !prices) {
      console.warn(`[Yahoo Finance] Nenhum dado disponível para ${symbol} (${period})`);
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

    console.log(`[Yahoo Finance] ${pricePoints.length} pontos de dados obtidos para ${symbol} (${period})`);
    return pricePoints;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[Yahoo Finance] Erro ao buscar ${symbol} (${period}):`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: `${BASE_URL}/${symbol}`,
      });
    } else {
      console.error(`[Yahoo Finance] Erro inesperado ao buscar ${symbol} (${period}):`, error);
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
    const url = `${BASE_URL}/AAPL`;
    const params = { range: '1d', interval: '1d' };

    const data = await fetchWithCorsProxy(url, params, 5000);
    return !data.chart.error;
  } catch (error) {
    console.error('Yahoo Finance health check failed:', error);
    return false;
  }
}
