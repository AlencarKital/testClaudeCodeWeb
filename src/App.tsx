import { useState } from 'react';
import Ticker from './components/Ticker';
import StockSelector from './components/StockSelector';
import { AVAILABLE_STOCKS, DEFAULT_SELECTED_SYMBOLS } from './data/stocks';
import { useStockData } from './hooks/useStockData';
import './App.css';

function App() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SELECTED_SYMBOLS);
  const stocks = useStockData(AVAILABLE_STOCKS, selectedSymbols);

  const handleToggleStock = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  return (
    <div className="app">
      <StockSelector
        availableStocks={AVAILABLE_STOCKS}
        selectedSymbols={selectedSymbols}
        onToggleStock={handleToggleStock}
      />
      <Ticker stocks={stocks} />
    </div>
  );
}

export default App;
