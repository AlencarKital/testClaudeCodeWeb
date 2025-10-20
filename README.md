# 📈 NASDAQ Stock Ticker

Uma aplicação moderna e interativa para acompanhamento de ações da NASDAQ em tempo real.

![React](https://img.shields.io/badge/React-18.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)

## 🚀 Funcionalidades

- **Ticker em Tempo Real**: Visualize as cotações das ações com atualização automática a cada 3 segundos
- **Seleção Configurável**: Escolha quais ações você deseja acompanhar
- **Interface Moderna**: Design dark mode responsivo e elegante
- **Dados Simulados**: Simulação realista de variações de preços e volume
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
├── components/          # Componentes React
│   ├── Ticker.tsx      # Componente principal do ticker
│   ├── StockCard.tsx   # Card individual de cada ação
│   └── StockSelector.tsx # Seletor de ações
├── hooks/              # React hooks customizados
│   └── useStockData.ts # Hook para simulação de dados
├── types/              # Definições TypeScript
│   └── stock.ts        # Interfaces das ações
├── data/               # Dados e configurações
│   └── stocks.ts       # Lista de ações disponíveis
├── App.tsx             # Componente raiz
└── main.tsx           # Entry point
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
- Preço atual
- Variação em dólares e percentual
- Volume de negociação
- Market Cap estimado

## 🔄 Simulação em Tempo Real

A aplicação simula dados em tempo real com:
- Atualização automática a cada 3 segundos
- Variações aleatórias de preço realistas
- Incremento de volume
- Cálculo de variação percentual

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
- Componentização e reutilização
- CSS moderno com animações
- Simulação de dados em tempo real

---

Desenvolvido com ❤️ usando React + TypeScript + Vite
