import type { AvailableStock } from '../types/stock';
import './StockSelector.css';

interface StockSelectorProps {
  availableStocks: AvailableStock[];
  selectedSymbols: string[];
  onToggleStock: (symbol: string) => void;
}

const StockSelector = ({ availableStocks, selectedSymbols, onToggleStock }: StockSelectorProps) => {
  return (
    <div className="stock-selector">
      <h3 className="selector-title">Selecione as Ações para Acompanhar</h3>
      <div className="selector-grid">
        {availableStocks.map(stock => {
          const isSelected = selectedSymbols.includes(stock.symbol);
          return (
            <button
              key={stock.symbol}
              className={`selector-button ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleStock(stock.symbol)}
            >
              <div className="selector-symbol">{stock.symbol}</div>
              <div className="selector-name">{stock.name}</div>
              {isSelected && <div className="checkmark">✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StockSelector;
