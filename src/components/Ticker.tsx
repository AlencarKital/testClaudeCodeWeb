import type { Stock } from '../types/stock';
import StockCard from './StockCard';
import './Ticker.css';

interface TickerProps {
  stocks: Stock[];
  onStockClick?: (stock: Stock) => void;
}

const Ticker = ({ stocks, onStockClick }: TickerProps) => {
  return (
    <div className="ticker-container">
      <div className="ticker-header">
        <h2 className="ticker-title">📈 NASDAQ Live Ticker</h2>
        <div className="ticker-subtitle">
          Atualizando em tempo real • {stocks.length} ações
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>Selecione ações acima para começar a acompanhar</p>
        </div>
      ) : (
        <div className="ticker-grid">
          {stocks.map(stock => (
            <StockCard
              key={stock.symbol}
              stock={stock}
              onClick={() => onStockClick?.(stock)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Ticker;
