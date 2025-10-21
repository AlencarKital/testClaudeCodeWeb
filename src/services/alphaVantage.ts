import type { TimePeriod, PricePoint } from '../types/stock';

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

// Cache para evitar exceder limites da API (5 chamadas/minuto, 500/dia)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 60000; // 1 minuto

// Rate limiting
let requestCount = 0;
let lastRequestTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 5;
const MINUTE_MS = 60000;

// Interfaces para resposta da API
interface GlobalQuoteResponse {
  'Global Quote': {
    '01. symbol': string;
    '05. price': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

interface IntradayData {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Interval': string;
  };
  [key: string]: any;
}

interface DailyData {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
  };
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

/**
 * Controle de rate limiting
 */
async function checkRateLimit(): Promise<void> {
  const now = Date.now();

  // Reset contador se passou 1 minuto
  if (now - lastRequestTime > MINUTE_MS) {
    requestCount = 0;
    lastRequestTime = now;
  }

  // Se atingiu o limite, aguardar
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = MINUTE_MS - (now - lastRequestTime);
    console.warn(`Rate limit atingido. Aguardando ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    lastRequestTime = Date.now();
  }

  requestCount++;
}

/**
 * Busca dados do cache ou faz requisição
 */
async function fetchWithCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    console.log(`Cache hit: ${cacheKey}`);
    return cached.data;
  }

  // Fazer requisição
  await checkRateLimit();
  const data = await fetchFn();

  // Salvar no cache
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });

  return data;
}

/**
 * Busca cotação atual de uma ação
 */
export async function fetchQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}> {
  const cacheKey = `quote_${symbol}`;

  const data = await fetchWithCache<GlobalQuoteResponse>(
    cacheKey,
    async () => {
      const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar cotação: ${response.statusText}`);
      }

      const json = await response.json();

      // Verificar se há erro da API
      if (json['Error Message']) {
        throw new Error(`API Error: ${json['Error Message']}`);
      }

      if (json['Note']) {
        throw new Error('Rate limit da API atingido. Aguarde alguns minutos.');
      }

      return json;
    },
    30000 // Cache de 30 segundos para cotações
  );

  const quote = data['Global Quote'];

  return {
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    previousClose: parseFloat(quote['08. previous close'])
  };
}

/**
 * Mapeia período para intervalo da API
 */
function periodToInterval(period: TimePeriod): string {
  const mapping: Record<TimePeriod, string> = {
    '15min': '15min',
    '1h': '60min',
    '1d': 'daily',
    '5d': 'daily',
    '1m': 'daily',
    '3m': 'daily',
    '6m': 'daily',
    '1y': 'daily'
  };

  return mapping[period];
}

/**
 * Busca dados históricos intraday
 */
async function fetchIntraday(
  symbol: string,
  interval: string,
  outputsize: 'compact' | 'full' = 'compact'
): Promise<PricePoint[]> {
  const cacheKey = `intraday_${symbol}_${interval}_${outputsize}`;

  const data = await fetchWithCache<IntradayData>(
    cacheKey,
    async () => {
      const url = `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados intraday: ${response.statusText}`);
      }

      const json = await response.json();

      if (json['Error Message']) {
        throw new Error(`API Error: ${json['Error Message']}`);
      }

      if (json['Note']) {
        throw new Error('Rate limit da API atingido. Aguarde alguns minutos.');
      }

      return json;
    },
    300000 // Cache de 5 minutos para dados históricos
  );

  // Processar dados
  const timeSeriesKey = `Time Series (${interval})`;
  const timeSeries = data[timeSeriesKey];

  if (!timeSeries) {
    throw new Error('Dados não encontrados na resposta da API');
  }

  const pricePoints: PricePoint[] = [];

  for (const [datetime, values] of Object.entries(timeSeries)) {
    const timeSeriesValues = values as {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
    pricePoints.push({
      timestamp: new Date(datetime).getTime(),
      price: parseFloat(timeSeriesValues['4. close'])
    });
  }

  // Ordenar por timestamp (mais antigo primeiro)
  return pricePoints.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Busca dados históricos diários
 */
async function fetchDaily(
  symbol: string,
  outputsize: 'compact' | 'full' = 'compact'
): Promise<PricePoint[]> {
  const cacheKey = `daily_${symbol}_${outputsize}`;

  const data = await fetchWithCache<DailyData>(
    cacheKey,
    async () => {
      const url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputsize}&apikey=${API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados diários: ${response.statusText}`);
      }

      const json = await response.json();

      if (json['Error Message']) {
        throw new Error(`API Error: ${json['Error Message']}`);
      }

      if (json['Note']) {
        throw new Error('Rate limit da API atingido. Aguarde alguns minutos.');
      }

      return json;
    },
    600000 // Cache de 10 minutos para dados diários
  );

  const timeSeries = data['Time Series (Daily)'];

  if (!timeSeries) {
    throw new Error('Dados não encontrados na resposta da API');
  }

  const pricePoints: PricePoint[] = [];

  for (const [date, values] of Object.entries(timeSeries)) {
    pricePoints.push({
      timestamp: new Date(date).getTime(),
      price: parseFloat(values['4. close'])
    });
  }

  // Ordenar por timestamp (mais antigo primeiro)
  return pricePoints.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Filtra dados históricos por período
 */
function filterByPeriod(data: PricePoint[], period: TimePeriod): PricePoint[] {
  const now = Date.now();
  const periodMs: Record<TimePeriod, number> = {
    '15min': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '5d': 5 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
    '3m': 90 * 24 * 60 * 60 * 1000,
    '6m': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };

  const cutoff = now - periodMs[period];
  return data.filter(point => point.timestamp >= cutoff);
}

/**
 * Busca dados históricos para um período específico
 */
export async function fetchHistoricalData(
  symbol: string,
  period: TimePeriod
): Promise<PricePoint[]> {
  const interval = periodToInterval(period);

  // Para períodos curtos (15min, 1h, 1d), usar intraday
  if (['15min', '60min'].includes(interval)) {
    const data = await fetchIntraday(symbol, interval, 'compact');
    return filterByPeriod(data, period);
  }

  // Para períodos longos, usar daily
  const outputsize = ['1y', '6m', '3m'].includes(period) ? 'full' : 'compact';
  const data = await fetchDaily(symbol, outputsize);
  return filterByPeriod(data, period);
}

/**
 * Busca todos os dados de uma ação (cotação + históricos)
 */
export async function fetchStockData(symbol: string) {
  try {
    // Buscar cotação atual
    const quote = await fetchQuote(symbol);

    // Buscar históricos para todos os períodos
    const periods: TimePeriod[] = ['15min', '1h', '1d', '5d', '1m', '3m', '6m', '1y'];
    const historicalData = new Map<TimePeriod, PricePoint[]>();

    // Buscar dados em lote (respeitando rate limit)
    for (const period of periods) {
      try {
        const data = await fetchHistoricalData(symbol, period);
        historicalData.set(period, data);
      } catch (error) {
        console.error(`Erro ao buscar histórico ${period} para ${symbol}:`, error);
        // Continuar com outros períodos mesmo se um falhar
      }
    }

    return {
      quote,
      historicalData
    };
  } catch (error) {
    console.error(`Erro ao buscar dados de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Limpa o cache (útil para testes)
 */
export function clearCache(): void {
  cache.clear();
  requestCount = 0;
  lastRequestTime = Date.now();
}
