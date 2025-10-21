const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

// Cache para evitar chamadas desnecessárias
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_DURATION = 30000; // 30 segundos

// Rate limiting - Finnhub free tier: 60 chamadas/minuto
let requestCount = 0;
let lastRequestTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 55; // Deixar margem de segurança
const MINUTE_MS = 60000;

// Interface para resposta da API Quote
interface FinnhubQuoteResponse {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
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
    console.warn(`[Finnhub] Rate limit atingido. Aguardando ${Math.ceil(waitTime / 1000)}s...`);
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
    console.log(`[Finnhub] Cache hit: ${cacheKey}`);
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

  const data = await fetchWithCache<FinnhubQuoteResponse>(
    cacheKey,
    async () => {
      const url = `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`;
      console.log(`[Finnhub] Buscando cotação de ${symbol}...`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`[Finnhub] Erro HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      // Verificar se a resposta contém dados válidos
      if (!json || json.c === 0 || json.c === undefined) {
        console.error(`[Finnhub] Resposta inválida para ${symbol}:`, json);
        throw new Error(`[Finnhub] Símbolo inválido ou sem dados disponíveis: ${symbol}`);
      }

      console.log(`[Finnhub] Resposta recebida para ${symbol}:`, json);
      return json;
    },
    30000 // Cache de 30 segundos para cotações
  );

  console.log(`[Finnhub] Cotação de ${symbol} obtida com sucesso: $${data.c}`);

  return {
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    previousClose: data.pc
  };
}

/**
 * Limpa o cache (útil para testes)
 */
export function clearCache(): void {
  cache.clear();
  requestCount = 0;
  lastRequestTime = Date.now();
}
