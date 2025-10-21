# 📈 NASDAQ Stock Ticker

Uma aplicação moderna e interativa para acompanhamento de ações da NASDAQ em tempo real com dados reais da API Alpha Vantage.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)
![Alpha Vantage](https://img.shields.io/badge/Alpha%20Vantage-API-green)

## 🚀 Funcionalidades

- **Dados Reais**: Integração com Alpha Vantage API para cotações reais de ações
- **Ticker em Tempo Real**: Visualize as cotações das ações com atualização automática a cada 30 segundos
- **Gráficos Históricos**: Visualize histórico de preços com múltiplos períodos (15min, 1h, 1d, 5d, 1m, 3m, 6m, 1y)
- **Seleção Configurável**: Escolha quais ações você deseja acompanhar
- **Interface Moderna**: Design dark mode responsivo e elegante
- **Cache Inteligente**: Sistema de cache para otimizar uso da API e respeitar rate limits
- **Ações Pré-configuradas**:
  - 🚗 Tesla (TSLA)
  - 📦 Amazon (AMZN)
  - 🔍 Google (GOOGL)
  - 🍎 Apple (AAPL)
  - 🎮 NVIDIA (NVDA)
  - 💻 Microsoft (MSFT)
  - E mais!

## 🛠️ Tecnologias

- **React 18** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite** - Build tool ultrarrápido
- **Recharts** - Biblioteca de gráficos
- **Alpha Vantage API** - Dados de mercado em tempo real
- **CSS3** - Estilização moderna com gradientes e animações

## 📦 Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Entre na pasta do projeto
cd nasdaq-tracker

# Instale as dependências
npm install
```

## 🔑 Configuração da API Key

A aplicação usa a API Alpha Vantage para buscar dados reais de ações. Para usar:

1. **Obtenha uma API key gratuita** em: https://www.alphavantage.co/support/#api-key
   - É rápido e não requer cartão de crédito
   - Plano gratuito: 5 chamadas/minuto, 500 chamadas/dia

2. **Configure a API key** no arquivo `.env`:
   ```bash
   # Copie o arquivo de exemplo
   cp .env.example .env

   # Edite o arquivo .env e adicione sua API key
   VITE_ALPHA_VANTAGE_API_KEY=sua_api_key_aqui
   ```

3. **Teste com a API key demo** (opcional):
   - O arquivo `.env` já vem com `VITE_ALPHA_VANTAGE_API_KEY=demo`
   - Funciona apenas com o símbolo IBM
   - Para usar com todas as ações, você precisa de uma API key própria

⚠️ **IMPORTANTE**: Nunca commite o arquivo `.env` com sua API key real. O arquivo está no `.gitignore` por segurança.

## 🎯 Como Usar

```bash
# Inicie o servidor de desenvolvimento
npm run dev

# A aplicação estará disponível em http://localhost:5173
```

## 🏗️ Build para Produção

```bash
# Cria build otimizado
npm run build

# Preview do build
npm run preview
```

## 📁 Estrutura do Projeto

```
src/
├── components/            # Componentes React
│   ├── Ticker.tsx        # Componente principal do ticker
│   ├── StockCard.tsx     # Card individual de cada ação
│   ├── StockSelector.tsx # Seletor de ações
│   └── StockChartModal.tsx # Modal com gráfico histórico
├── hooks/                # React hooks customizados
│   └── useStockData.ts   # Hook para buscar dados da API
├── services/             # Serviços de integração
│   └── alphaVantage.ts   # Integração com Alpha Vantage API
├── types/                # Definições TypeScript
│   └── stock.ts          # Interfaces das ações
├── data/                 # Dados e configurações
│   └── stocks.ts         # Lista de ações disponíveis
├── App.tsx               # Componente raiz
└── main.tsx             # Entry point
```

## 🎨 Características Visuais

- **Design Dark Mode**: Interface escura moderna ideal para dashboards
- **Animações Suaves**: Transições e efeitos hover
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Cores Dinâmicas**: Verde para alta, vermelho para baixa
- **Gradientes**: Efeitos visuais modernos

## 📊 Dados Exibidos

Para cada ação, o ticker mostra:
- Símbolo e nome da empresa
- Preço atual (dados reais da API)
- Variação em dólares e percentual
- Volume de negociação
- Market Cap calculado
- Gráficos históricos com múltiplos períodos

## 🔄 Atualização em Tempo Real

A aplicação busca dados reais da API Alpha Vantage:
- **Cotações**: Atualizadas a cada 30 segundos
- **Históricos**: Atualizados a cada 5 minutos
- **Cache Inteligente**: Evita chamadas desnecessárias à API
- **Rate Limiting**: Respeita limites de 5 chamadas/minuto da API
- **Dados Reais**: Preços e variações são reais do mercado

## ⚙️ Características Técnicas da API

- **Endpoints Utilizados**:
  - `GLOBAL_QUOTE`: Cotação atual de uma ação
  - `TIME_SERIES_INTRADAY`: Dados intraday (15min, 1h)
  - `TIME_SERIES_DAILY`: Histórico diário (1d, 5d, 1m, 3m, 6m, 1y)

- **Sistema de Cache**:
  - Cotações: 30 segundos
  - Histórico intraday: 5 minutos
  - Histórico diário: 10 minutos

- **Otimizações**:
  - Carregamento prioritário de períodos mais usados
  - Requisições sequenciais com delays para respeitar rate limit
  - Estados de loading e error para melhor UX

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

## 📝 Licença

Este projeto é open source e está disponível sob a licença MIT.

## 🎓 Aprendizado

Este projeto é uma excelente oportunidade para aprender:
- Gerenciamento de estado com React Hooks
- TypeScript para type safety
- Integração com APIs REST (Alpha Vantage)
- Componentização e reutilização
- CSS moderno com animações
- Sistema de cache e otimização de requisições
- Rate limiting e controle de chamadas à API
- Tratamento de estados assíncronos (loading, error)
- Visualização de dados com gráficos (Recharts)

## 📝 Notas Importantes

- ⚠️ A API gratuita tem limite de **5 chamadas/minuto** e **500 chamadas/dia**
- 💡 O sistema de cache minimiza o uso da API automaticamente
- 🔐 Nunca compartilhe sua API key publicamente
- 📊 Dados de mercado podem ter atraso de 15 minutos no plano gratuito
- 🌐 Funciona apenas com ações dos mercados americanos (NASDAQ, NYSE, etc.)

## 🔧 Troubleshooting

**Erro: "API Key inválida ou expirada" ou "Access denied":**
- Sua API key do Alpha Vantage está inválida ou expirou
- **Solução**: Obtenha uma nova API key gratuita em https://www.alphavantage.co/support/#api-key
- Atualize o arquivo `.env` com a nova chave
- Reinicie o servidor de desenvolvimento (`npm run dev`)

**Erro: "Cannot read properties of undefined (reading '05. price')":**
- Este erro indica que a API não está retornando dados válidos
- Geralmente causado por API key inválida
- Verifique se a API key no arquivo `.env` está correta

**Erro ao carregar dados:**
- Verifique se a API key está configurada corretamente no arquivo `.env`
- Confirme que não excedeu o limite de chamadas da API (5/minuto, 500/dia)
- Verifique sua conexão com a internet

**Dados não atualizam:**
- Abra o console do navegador para ver logs de erro
- Verifique se o cache está funcionando corretamente
- A API pode estar temporariamente indisponível

---

Desenvolvido com ❤️ usando React + TypeScript + Vite + Alpha Vantage API
