import type { Stock } from '../types/stock';
import './StockCard.css';

interface StockCardProps {
  stock: Stock;
  onClick?: () => void;
}

const StockCard = ({ stock, onClick }: StockCardProps) => {
  const isPositive = stock.change >= 0;
  const arrow = isPositive ? '▲' : '▼';

  // Indicador de tendência em tempo real
  const getTrendIndicator = () => {
    if (!stock.priceDirection) return null;

    const indicators = {
      up: { symbol: '↑', color: '#10b981', label: 'Subindo' },
      down: { symbol: '↓', color: '#ef4444', label: 'Descendo' },
      neutral: { symbol: '→', color: '#6b7280', label: 'Estável' }
    };

    const indicator = indicators[stock.priceDirection];

    return (
      <span
        className="trend-indicator"
        style={{ color: indicator.color }}
        title={indicator.label}
      >
        {indicator.symbol}
      </span>
    );
  };

  return (
    <div className="stock-card" onClick={onClick}>
      <div className="stock-header">
        <div className="stock-symbol">{stock.symbol}</div>
        <div className="stock-name">{stock.name}</div>
      </div>

      <div className="stock-price">
        ${stock.price.toFixed(2)}
        {getTrendIndicator()}
      </div>

      <div className="stock-range">
        <span className="range-label">Faixa do dia:</span>
        <span className="range-values">
          ${stock.dayLow.toFixed(2)} - ${stock.dayHigh.toFixed(2)}
        </span>
      </div>

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
