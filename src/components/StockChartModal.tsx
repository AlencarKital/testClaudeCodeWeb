import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Stock, TimePeriod } from '../types/stock';
import './StockChartModal.css';

interface StockChartModalProps {
  stock: Stock;
  onClose: () => void;
}

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '15min', label: '15min' },
  { value: '1h', label: '1h' },
  { value: '1d', label: '1 Dia' },
  { value: '5d', label: '5 Dias' },
  { value: '1m', label: '1 Mês' },
  { value: '3m', label: '3 Meses' },
  { value: '6m', label: '6 Meses' },
  { value: '1y', label: '1 Ano' },
];

// Format time based on period (similar to Robinhood)
const formatTimeForPeriod = (timestamp: number, period: TimePeriod): string => {
  const date = new Date(timestamp);

  switch (period) {
    case '15min':
    case '1h':
    case '1d':
      // Show time for intraday
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    case '5d':
      // Show day and time
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });
    case '1m':
    case '3m':
    case '6m':
    case '1y':
      // Show date for longer periods
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    default:
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
  }
};

const StockChartModal = ({ stock, onClose }: StockChartModalProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');

  // Get price history for selected period
  const chartData = useMemo(() => {
    const periodHistory = stock.priceHistory.get(selectedPeriod);
    if (!periodHistory || periodHistory.length === 0) return [];

    return periodHistory.map(point => ({
      time: formatTimeForPeriod(point.timestamp, selectedPeriod),
      timestamp: point.timestamp,
      price: point.price,
    }));
  }, [stock.priceHistory, selectedPeriod]);

  // Calculate price change for the selected period
  const periodChange = useMemo(() => {
    if (chartData.length < 2) return { amount: 0, percent: 0 };

    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const amount = lastPrice - firstPrice;
    const percent = (amount / firstPrice) * 100;

    return { amount, percent };
  }, [chartData]);

  const isPositive = periodChange.amount >= 0;
  const chartColor = isPositive ? '#34d399' : '#f87171';

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatYAxis = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {stock.symbol} - {stock.name}
            </h2>
            <div className="modal-price-info">
              <span className="modal-current-price">${stock.price.toFixed(2)}</span>
              <span className={`modal-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '▲' : '▼'} ${Math.abs(periodChange.amount).toFixed(2)} (
                {periodChange.percent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="time-period-selector">
          {TIME_PERIODS.map(period => (
            <button
              key={period.value}
              className={`period-button ${
                selectedPeriod === period.value ? 'active' : ''
              }`}
              onClick={() => setSelectedPeriod(period.value)}
            >
              {period.label}
            </button>
          ))}
        </div>

        <div className="chart-container">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Preço']}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={chartColor}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-message">
              Sem dados suficientes para o período selecionado.
              Aguarde alguns segundos para acumular dados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockChartModal;
