import { useState } from 'react';
import Ticker from './components/Ticker';
import StockSelector from './components/StockSelector';
import StockChartModal from './components/StockChartModal';
import { AVAILABLE_STOCKS, DEFAULT_SELECTED_SYMBOLS } from './data/stocks';
import { useStockData } from './hooks/useStockData';
import type { Stock } from './types/stock';
import './App.css';

function App() {
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(DEFAULT_SELECTED_SYMBOLS);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const stocks = useStockData(AVAILABLE_STOCKS, selectedSymbols);

  const handleToggleStock = (symbol: string) => {
    setSelectedSymbols(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const handleStockClick = (stock: Stock) => {
    setSelectedStock(stock);
  };

  const handleCloseModal = () => {
    setSelectedStock(null);
  };

  return (
    <div className="app">
      <StockSelector
        availableStocks={AVAILABLE_STOCKS}
        selectedSymbols={selectedSymbols}
        onToggleStock={handleToggleStock}
      />
      <Ticker stocks={stocks} onStockClick={handleStockClick} />
      {selectedStock && (
        <StockChartModal stock={selectedStock} onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default App;
