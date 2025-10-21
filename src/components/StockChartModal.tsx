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
import type { Stock } from '../types/stock';
import './StockChartModal.css';

interface StockChartModalProps {
  stock: Stock;
  onClose: () => void;
}

type TimePeriod = '15min' | '1h' | '1d' | '5d' | '1m' | '3m' | '6m' | '1y';

const TIME_PERIODS: { value: TimePeriod; label: string; minutes: number }[] = [
  { value: '15min', label: '15min', minutes: 15 },
  { value: '1h', label: '1h', minutes: 60 },
  { value: '1d', label: '1 Dia', minutes: 1440 },
  { value: '5d', label: '5 Dias', minutes: 7200 },
  { value: '1m', label: '1 Mês', minutes: 43200 },
  { value: '3m', label: '3 Meses', minutes: 129600 },
  { value: '6m', label: '6 Meses', minutes: 259200 },
  { value: '1y', label: '1 Ano', minutes: 525600 },
];

const StockChartModal = ({ stock, onClose }: StockChartModalProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');

  // Filter price history based on selected period
  const chartData = useMemo(() => {
    const period = TIME_PERIODS.find(p => p.value === selectedPeriod);
    if (!period) return [];

    const cutoffTime = Date.now() - period.minutes * 60 * 1000;
    const filteredData = stock.priceHistory.filter(
      point => point.timestamp >= cutoffTime
    );

    return filteredData.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
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
