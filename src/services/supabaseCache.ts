import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PricePoint, TimePeriod } from '../types/stock';

// Configuração do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// TTL (Time To Live) para cada tipo de período em milissegundos
const CACHE_TTL: Record<TimePeriod, number> = {
  '15min': 15 * 60 * 1000, // 15 minutos
  '1h': 30 * 60 * 1000, // 30 minutos
  '1d': 60 * 60 * 1000, // 1 hora
  '5d': 2 * 60 * 60 * 1000, // 2 horas
  '1m': 6 * 60 * 60 * 1000, // 6 horas
  '3m': 12 * 60 * 60 * 1000, // 12 horas
  '6m': 24 * 60 * 60 * 1000, // 24 horas
  '1y': 7 * 24 * 60 * 60 * 1000, // 7 dias
};

interface CacheEntry {
  id?: string;
  symbol: string;
  period: TimePeriod;
  data: PricePoint[];
  created_at?: string;
  updated_at?: string;
  expires_at: string;
}

let supabase: SupabaseClient | null = null;

/**
 * Inicializa o cliente Supabase
 * @returns Cliente Supabase ou null se não configurado
 */
function getSupabaseClient(): SupabaseClient | null {
  // Se não tiver credenciais, retorna null (modo offline)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured. Cache disabled.');
    return null;
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabase;
}

/**
 * Busca dados do cache do Supabase
 * @param symbol - Símbolo da ação
 * @param period - Período dos dados
 * @returns Dados em cache ou null se não encontrado/expirado
 */
export async function getCachedData(
  symbol: string,
  period: TimePeriod
): Promise<PricePoint[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('stock_historical_cache')
      .select('data, expires_at')
      .eq('symbol', symbol)
      .eq('period', period)
      .single();

    if (error || !data) {
      return null;
    }

    // Verificar se o cache expirou
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Cache expirado, deletar
      await deleteCachedData(symbol, period);
      return null;
    }

    return data.data as PricePoint[];
  } catch (error) {
    console.error(`Error fetching cache for ${symbol} (${period}):`, error);
    return null;
  }
}

/**
 * Salva dados no cache do Supabase
 * @param symbol - Símbolo da ação
 * @param period - Período dos dados
 * @param data - Dados a serem salvos
 */
export async function setCachedData(
  symbol: string,
  period: TimePeriod,
  data: PricePoint[]
): Promise<void> {
  const client = getSupabaseClient();
  if (!client || data.length === 0) return;

  try {
    const now = new Date();
    const ttl = CACHE_TTL[period];
    const expiresAt = new Date(now.getTime() + ttl);

    const entry: CacheEntry = {
      symbol,
      period,
      data,
      expires_at: expiresAt.toISOString(),
    };

    // Upsert: atualiza se existe, cria se não existe
    const { error } = await client
      .from('stock_historical_cache')
      .upsert(entry, {
        onConflict: 'symbol,period',
      });

    if (error) {
      console.error(`Error caching data for ${symbol} (${period}):`, error);
    }
  } catch (error) {
    console.error(`Error setting cache for ${symbol} (${period}):`, error);
  }
}

/**
 * Deleta dados do cache
 * @param symbol - Símbolo da ação
 * @param period - Período dos dados
 */
export async function deleteCachedData(
  symbol: string,
  period: TimePeriod
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('stock_historical_cache')
      .delete()
      .eq('symbol', symbol)
      .eq('period', period);
  } catch (error) {
    console.error(`Error deleting cache for ${symbol} (${period}):`, error);
  }
}

/**
 * Limpa todo o cache de um símbolo
 * @param symbol - Símbolo da ação
 */
export async function clearSymbolCache(symbol: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('stock_historical_cache')
      .delete()
      .eq('symbol', symbol);
  } catch (error) {
    console.error(`Error clearing cache for ${symbol}:`, error);
  }
}

/**
 * Limpa todos os caches expirados (manutenção)
 */
export async function clearExpiredCache(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const now = new Date().toISOString();
    await client
      .from('stock_historical_cache')
      .delete()
      .lt('expires_at', now);
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
}

/**
 * Verifica se o Supabase está configurado e funcionando
 * @returns true se disponível
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('stock_historical_cache')
      .select('count')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Busca dados com cache: tenta buscar do cache primeiro, se não tiver, usa a função de fetch fornecida
 * @param symbol - Símbolo da ação
 * @param period - Período dos dados
 * @param fetchFn - Função para buscar dados se não estiver em cache
 * @returns Dados históricos
 */
export async function getOrFetchData(
  symbol: string,
  period: TimePeriod,
  fetchFn: () => Promise<PricePoint[]>
): Promise<PricePoint[]> {
  // Tentar buscar do cache primeiro
  const cachedData = await getCachedData(symbol, period);
  if (cachedData && cachedData.length > 0) {
    console.log(`Cache HIT for ${symbol} (${period})`);
    return cachedData;
  }

  console.log(`Cache MISS for ${symbol} (${period}), fetching...`);

  // Se não tiver em cache, buscar dos dados
  const freshData = await fetchFn();

  // Salvar no cache para próxima vez
  if (freshData.length > 0) {
    await setCachedData(symbol, period, freshData);
  }

  return freshData;
}
