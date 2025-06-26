'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface TokenWithPrice {
  symbol: string;
  name: string;
  usdValue: number;
  formattedBalance: string;
}

interface PortfolioHistoryProps {
  tokens: TokenWithPrice[];
  totalValue: number;
}

// Generate historical data based on selected timeframe
const generateHistoricalData = (currentValue: number, timeframe: '7d' | '30d' | '90d' | '1y') => {
  const data = [];
  const now = new Date();
  
  const timeframeDays = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  };
  
  const days = timeframeDays[timeframe];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic portfolio fluctuations based on timeframe
    const baseValue = currentValue;
    const volatility = timeframe === '7d' ? 0.05 : timeframe === '30d' ? 0.15 : timeframe === '90d' ? 0.25 : 0.4;
    const trend = Math.sin(i * 0.1) * 0.1;
    const random = (Math.random() - 0.5) * volatility;
    const multiplier = 1 + trend + random;
    
    const value = Math.max(baseValue * multiplier, 0);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 100) / 100,
      formattedDate: timeframe === '1y' 
        ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
  }
  
  // Ensure the last value matches current portfolio value
  if (data.length > 0) {
    data[data.length - 1].value = currentValue;
  }
  
  return data;
};

const generatePerformanceMetrics = (historicalData: { value: number }[], timeframe: '7d' | '30d' | '90d' | '1y') => {
  if (historicalData.length < 2) return null;
  
  const startValue = historicalData[0].value;
  const endValue = historicalData[historicalData.length - 1].value;
  const change = endValue - startValue;
  const changePercent = ((change / startValue) * 100);
  
  // Find highest and lowest values
  const values = historicalData.map(d => d.value);
  const highValue = Math.max(...values);
  const lowValue = Math.min(...values);
  
  const timeframeLabel = {
    '7d': '7D',
    '30d': '30D',
    '90d': '90D',
    '1y': '1Y'
  };
  
  return {
    change: change,
    changePercent: changePercent,
    high: highValue,
    low: lowValue,
    label: timeframeLabel[timeframe]
  };
};

export default function PortfolioHistory({ tokens, totalValue }: PortfolioHistoryProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  const historicalData = generateHistoricalData(totalValue, selectedTimeframe);
  const performanceMetrics = generatePerformanceMetrics(historicalData, selectedTimeframe);
  
  // Generate allocation data for pie chart
  const allocationData = tokens
    .filter(token => token.usdValue > 0)
    .map(token => ({
      name: token.symbol,
      value: token.usdValue,
      percentage: ((token.usdValue / totalValue) * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);
  
  // Colors for the pie chart
  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];
  
  const timeframeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  
  const formatTooltipValue = (value: number): [string, string] => [formatCurrency(value), 'Portfolio Value'];
  
  return (
    <div className="space-y-8">
      {/* Performance Summary */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Portfolio Performance</h3>
          <div className="flex items-center space-x-2">
            {timeframeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedTimeframe(option.value as '7d' | '30d' | '90d' | '1y')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimeframe === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {performanceMetrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</div>
              <div className="text-sm text-gray-500">Current Value</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${performanceMetrics.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceMetrics.change >= 0 ? '+' : ''}{formatCurrency(performanceMetrics.change)}
              </div>
              <div className="text-sm text-gray-500">{performanceMetrics.label} Change</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${performanceMetrics.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {performanceMetrics.changePercent >= 0 ? '+' : ''}{performanceMetrics.changePercent.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-500">{performanceMetrics.label} Change %</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(performanceMetrics.high)}</div>
              <div className="text-sm text-gray-500">{performanceMetrics.label} High</div>
            </div>
          </div>
        )}
        
        {/* Portfolio Value Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                  return `$${value.toFixed(0)}`;
                }}
              />
              <Tooltip 
                formatter={formatTooltipValue}
                labelStyle={{ color: '#374151' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Portfolio Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Portfolio Allocation</h3>
          
          {allocationData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ percentage }) => `${percentage}%`}
                    labelLine={false}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatTooltipValue} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              No token data available
            </div>
          )}
        </div>
        
        {/* Asset Breakdown */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Asset Breakdown</h3>
          
          <div className="space-y-4">
            {allocationData.map((asset, index) => (
              <div key={asset.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium text-gray-900">{asset.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(asset.value)}</div>
                  <div className="text-sm text-gray-500">{asset.percentage}%</div>
                </div>
              </div>
            ))}
            
            {allocationData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No assets to display
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Token Performance Bar Chart */}
      {allocationData.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Token Values</h3>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                    return `$${value.toFixed(0)}`;
                  }}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Performance Insights */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-600">📈</span>
              <span className="font-medium text-blue-900">Diversification Score</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {allocationData.length > 0 ? Math.min(allocationData.length * 20, 100) : 0}%
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Based on {allocationData.length} different assets
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-xl">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-600">💎</span>
              <span className="font-medium text-green-900">Top Holding</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {allocationData.length > 0 ? allocationData[0].name : 'N/A'}
            </div>
            <p className="text-sm text-green-700 mt-1">
              {allocationData.length > 0 ? `${allocationData[0].percentage}% of portfolio` : 'No holdings'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}