-- Schema para cache de dados históricos de ações
-- Execute este SQL no Supabase SQL Editor

-- Tabela para armazenar dados históricos em cache
CREATE TABLE IF NOT EXISTS stock_historical_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  period VARCHAR(10) NOT NULL, -- '1d', '5d', '1m', '3m', '6m', '1y', '15min', '1h'
  data JSONB NOT NULL, -- Array de PricePoint: [{timestamp: number, price: number}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Constraint para garantir único cache por símbolo+período
  UNIQUE(symbol, period)
);

-- Índices para otimizar queries
CREATE INDEX IF NOT EXISTS idx_stock_cache_symbol ON stock_historical_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_cache_period ON stock_historical_cache(period);
CREATE INDEX IF NOT EXISTS idx_stock_cache_expires ON stock_historical_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_stock_cache_symbol_period ON stock_historical_cache(symbol, period);

-- Função para limpar dados expirados automaticamente
CREATE OR REPLACE FUNCTION delete_expired_cache()
RETURNS VOID AS $$
BEGIN
  DELETE FROM stock_historical_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Configurar Row Level Security (RLS) - Permitir acesso público para leitura
ALTER TABLE stock_historical_cache ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura por qualquer pessoa
CREATE POLICY "Allow public read access"
  ON stock_historical_cache
  FOR SELECT
  USING (true);

-- Política para permitir insert/update/delete por qualquer pessoa (se necessário)
-- NOTA: Em produção, você pode querer restringir isso apenas para serviços autenticados
CREATE POLICY "Allow public insert access"
  ON stock_historical_cache
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON stock_historical_cache
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete access"
  ON stock_historical_cache
  FOR DELETE
  USING (true);

-- Comentários para documentação
COMMENT ON TABLE stock_historical_cache IS 'Cache de dados históricos de ações com TTL';
COMMENT ON COLUMN stock_historical_cache.symbol IS 'Símbolo da ação (ex: AAPL, GOOGL)';
COMMENT ON COLUMN stock_historical_cache.period IS 'Período dos dados (15min, 1h, 1d, 5d, 1m, 3m, 6m, 1y)';
COMMENT ON COLUMN stock_historical_cache.data IS 'Array JSON de pontos de preço com timestamp e price';
COMMENT ON COLUMN stock_historical_cache.expires_at IS 'Timestamp de expiração do cache';
