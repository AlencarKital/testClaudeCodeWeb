# Guia de Refatoração - Sistema de Dados Históricos

## 📋 Resumo das Mudanças

Refatoramos o sistema de busca de dados para resolver os problemas de limite de API da Alpha Vantage:

### Antes
- **Alpha Vantage** → Cotações em tempo real + dados históricos
- ❌ Atingia limites de API muito rapidamente (5 req/min, 500/dia)
- ❌ Sem cache persistente (apenas em memória)
- ❌ Dados históricos buscados repetidamente

### Depois
- **Alpha Vantage** → Apenas cotações em tempo real (30s refresh)
- **Yahoo Finance** → Dados históricos (sem limites rígidos)
- **Supabase** → Cache persistente dos dados históricos
- ✅ Muito menos chamadas à Alpha Vantage
- ✅ Dados históricos servidos do cache na maioria das vezes
- ✅ Sistema escalável e eficiente

## 🏗️ Arquitetura

```
┌─────────────────┐
│   React App     │
└────────┬────────┘
         │
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌────────────────┐                    ┌─────────────────┐
│ Alpha Vantage  │                    │ Yahoo Finance   │
│ (Real-time)    │                    │ (Historical)    │
└────────────────┘                    └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ Supabase Cache  │
                                      │ (PostgreSQL)    │
                                      └─────────────────┘
```

## 📁 Novos Arquivos

### 1. `src/services/yahooFinance.ts`
Serviço para buscar dados históricos do Yahoo Finance (gratuito, sem API key).

**Principais funções:**
- `fetchHistoricalData(symbol, period)` - Busca histórico de uma ação
- `fetchMultipleHistoricalData(symbols, period)` - Busca múltiplas ações em paralelo
- `checkYahooFinanceHealth()` - Verifica disponibilidade da API

### 2. `src/services/supabaseCache.ts`
Gerenciamento de cache no Supabase com TTL automático.

**Principais funções:**
- `getCachedData(symbol, period)` - Busca do cache
- `setCachedData(symbol, period, data)` - Salva no cache
- `getOrFetchData(symbol, period, fetchFn)` - Busca do cache ou fonte
- `clearExpiredCache()` - Limpeza de cache expirado

**TTL (Time To Live) por período:**
- 15min → 15 minutos
- 1h → 30 minutos
- 1d → 1 hora
- 5d → 2 horas
- 1m → 6 horas
- 3m → 12 horas
- 6m → 24 horas
- 1y → 7 dias

### 3. `supabase-schema.sql`
Schema SQL para criar a tabela de cache no Supabase.

**Estrutura:**
- Tabela `stock_historical_cache`
- Índices otimizados
- Row Level Security (RLS) configurado
- Políticas de acesso público (read/write)

## 🚀 Como Configurar

### Passo 1: Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
# Alpha Vantage (cotações em tempo real)
VITE_ALPHA_VANTAGE_API_KEY=sua_chave_aqui

# Supabase (cache de dados históricos)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### Passo 2: Criar Projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Crie um novo projeto (gratuito)
3. Anote o **Project URL** e **anon public key** (Settings > API)

### Passo 3: Executar o Schema SQL

1. No Supabase, vá para **SQL Editor**
2. Copie o conteúdo de `supabase-schema.sql`
3. Execute o script
4. Verifique se a tabela `stock_historical_cache` foi criada

### Passo 4: Instalar Dependências

```bash
npm install
```

As novas dependências já estão no `package.json`:
- `@supabase/supabase-js` - Cliente Supabase
- `axios` - HTTP client para Yahoo Finance

### Passo 5: Executar a Aplicação

```bash
npm run dev
```

## 🔄 Fluxo de Dados

### Cotações em Tempo Real
1. Usuário acessa a aplicação
2. `useStockData` busca cotações via `fetchQuote` (Alpha Vantage)
3. Atualiza a cada 30 segundos automaticamente
4. **Sem cache** (sempre dados frescos)

### Dados Históricos
1. Usuário abre um gráfico
2. `useStockData` chama `fetchStockHistory`
3. `fetchStockHistory` usa `getOrFetchData`:
   - ✅ Se tem no cache do Supabase → retorna imediatamente
   - ❌ Se não tem → busca do Yahoo Finance e salva no cache
4. Próxima vez que abrir o mesmo gráfico → cache HIT

## 📊 Otimizações

### Cache Inteligente
- Períodos mais curtos (15min, 1h) expiram mais rápido
- Períodos mais longos (6m, 1y) expiram mais lentamente
- Cache expira automaticamente (TTL no banco)

### Carregamento Progressivo
Mantivemos a estratégia "estilo Robinhood":
1. Carrega períodos prioritários primeiro: `1d`, `1h`, `5d`, `1m`
2. Demais períodos carregam em background
3. UI responsiva desde o início

### Redução de Chamadas à API
- **Antes:** ~40 chamadas por sessão (10 stocks × 4 períodos prioritários)
- **Depois:** ~10 chamadas na primeira vez, depois ZERO (tudo do cache)

## 🧪 Testando

### Verificar Cache
Abra o console do navegador e veja:
- `Cache HIT for AAPL (1d)` → Dados do cache
- `Cache MISS for AAPL (1d), fetching...` → Buscando do Yahoo Finance

### Verificar no Supabase
1. Vá para **Table Editor** no Supabase
2. Abra a tabela `stock_historical_cache`
3. Veja os registros sendo criados/atualizados

## 🐛 Troubleshooting

### Cache não está funcionando
- Verifique se as variáveis de ambiente do Supabase estão corretas
- Verifique se o schema SQL foi executado
- Veja o console do navegador para erros

### Yahoo Finance não retorna dados
- Verifique a conexão com internet
- Alguns símbolos podem não estar disponíveis
- Yahoo Finance pode estar temporariamente indisponível

### Alpha Vantage ainda atingindo limites
- Verifique se você está fazendo muitas atualizações manuais
- O intervalo de 30s para cotações em tempo real é respeitado
- Dados históricos **não** usam mais Alpha Vantage

## 📝 Notas Técnicas

### Modo Offline do Supabase
Se as credenciais do Supabase não estiverem configuradas:
- A aplicação funciona normalmente
- Cache é desabilitado
- Dados históricos sempre buscados do Yahoo Finance
- Console mostra: `Supabase not configured. Cache disabled.`

### Yahoo Finance API
- Usamos o endpoint público `query1.finance.yahoo.com`
- **Não requer API key**
- Retorna dados em formato JSON
- Limites muito mais generosos que Alpha Vantage

### Compatibilidade
- Mantém a interface existente (`PricePoint[]`)
- Não quebra componentes existentes
- Apenas muda a fonte de dados históricos

## 🎯 Próximos Passos (Opcional)

1. **Dashboard de Cache** - Página para visualizar estatísticas do cache
2. **Limpeza Automática** - Cron job para limpar cache expirado
3. **Retry Logic** - Retry automático em falhas de rede
4. **WebSocket** - Cotações em tempo real via WebSocket
5. **Gráficos Avançados** - Candlestick charts com mais indicadores

## 📚 Recursos

- [Alpha Vantage API Docs](https://www.alphavantage.co/documentation/)
- [Yahoo Finance API](https://query1.finance.yahoo.com/)
- [Supabase Docs](https://supabase.com/docs)
- [React Query (alternativa futura)](https://tanstack.com/query/latest)

---

**Desenvolvido com ❤️ usando React + TypeScript + Vite + Supabase**
