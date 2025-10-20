import type { Stock } from '../types/stock';
import './StockCard.css';

interface StockCardProps {
  stock: Stock;
}

const StockCard = ({ stock }: StockCardProps) => {
  const isPositive = stock.change >= 0;
  const arrow = isPositive ? '▲' : '▼';

  return (
    <div className="stock-card">
      <div className="stock-header">
        <div className="stock-symbol">{stock.symbol}</div>
        <div className="stock-name">{stock.name}</div>
      </div>

      <div className="stock-price">${stock.price.toFixed(2)}</div>

      <div className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
        <span className="arrow">{arrow}</span>
        <span className="change-value">${Math.abs(stock.change).toFixed(2)}</span>
        <span className="change-percent">({stock.changePercent.toFixed(2)}%)</span>
      </div>

      <div className="stock-details">
        <div className="detail-item">
          <span className="detail-label">Volume:</span>
          <span className="detail-value">{stock.volume.toLocaleString()}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Market Cap:</span>
          <span className="detail-value">{stock.marketCap}</span>
        </div>
      </div>
    </div>
  );
};

export default StockCard;
