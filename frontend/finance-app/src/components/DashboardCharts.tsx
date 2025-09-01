import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { DashboardStats, MonthlySummary } from '@/lib/api';

interface ChartProps {
  stats: DashboardStats;
  dailyStats?: DashboardStats | null;
  monthlySummary: MonthlySummary;
}

// Custom colors for consistent theming
const COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#059669', '#0d9488'];

// Income vs Expense Pie Chart
export const IncomeExpensePieChart: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const data = stats.totals.map(item => ({
    name: item._id === 'income' ? 'Income' : 'Expense',
    value: item.total,
    count: item.count,
    fill: item._id === 'income' ? '#10b981' : '#ef4444'
  }));

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value, percent }) => 
            `${name}: ${formatCurrency(value || 0)} (${((percent || 0) * 100).toFixed(1)}%)`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// Category Spending Chart
export const CategorySpendingChart: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  const expenseData = stats.categoryStats
    .filter(cat => cat._id.type === 'expense')
    .slice(0, 8) // Top 8 categories
    .map(cat => ({
      name: cat._id.categoryName,
      amount: cat.totalAmount,
      count: cat.count,
      fill: cat._id.categoryColor
    }));

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={expenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={80}
          fontSize={12}
        />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), 'Amount']}
          labelFormatter={(label) => `Category: ${label}`}
        />
        <Bar dataKey="amount" fill="#8884d8">
          {expenseData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// Monthly Trend Chart (if you have historical data)
export const MonthlyTrendChart: React.FC<{ stats: DashboardStats }> = ({ stats }) => {
  // Process monthly data from stats
  const monthlyData = stats.stats.reduce((acc: any[], item) => {
    const monthKey = `${item._id.year}-${String(item._id.month || 1).padStart(2, '0')}`;
    const existingMonth = acc.find(m => m.month === monthKey);
    
    if (existingMonth) {
      if (item._id.type === 'income') {
        existingMonth.income = item.totalAmount;
      } else {
        existingMonth.expense = item.totalAmount;
      }
    } else {
      acc.push({
        month: monthKey,
        income: item._id.type === 'income' ? item.totalAmount : 0,
        expense: item._id.type === 'expense' ? item.totalAmount : 0,
      });
    }
    
    return acc;
  }, []);

  // Sort by month chronologically first
  const sortedData = monthlyData.sort((a, b) => a.month.localeCompare(b.month));

  // Calculate running balance (cumulative from the beginning)
  let runningBalance = 0;
  const processedData = sortedData.map(item => {
    const monthlyNet = item.income - item.expense;
    runningBalance += monthlyNet;
    
    return {
      ...item,
      monthlyNet, // This month's income - expenses
      balance: runningBalance, // Running cumulative balance
      monthName: new Date(item.month + '-01').toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
    };
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="monthName" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="income" 
          stroke="#10b981" 
          strokeWidth={2}
          name="Income"
        />
        <Line 
          type="monotone" 
          dataKey="expense" 
          stroke="#ef4444" 
          strokeWidth={2}
          name="Expense"
        />
        <Line 
          type="monotone" 
          dataKey="balance" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Balance"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Daily Spending Area Chart (for current month if data available)
export const DailySpendingChart: React.FC<{ dailyStats?: DashboardStats | null }> = ({ dailyStats }) => {
  if (!dailyStats) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <p>Daily data not available</p>
      </div>
    );
  }

  // Process daily data from stats (if groupBy was set to 'day')
  const dailyData = dailyStats.stats
    .filter(item => item._id.day && item._id.type === 'expense')
    .map(item => ({
      day: `${item._id.month}/${item._id.day}`,
      amount: item.totalAmount,
      count: item.count,
      date: new Date(item._id.year, (item._id.month || 1) - 1, item._id.day || 1)
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  if (dailyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <p>Switch to daily view to see daily spending trends</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="day" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip 
          formatter={(value: number) => [formatCurrency(value), 'Spending']}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Area 
          type="monotone" 
          dataKey="amount" 
          stroke="#ef4444" 
          fill="#fecaca" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Summary Dashboard Charts Component
export const DashboardCharts: React.FC<ChartProps> = ({ stats, dailyStats, monthlySummary }) => {
  if (!stats || !stats.totals.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* First Row - Income/Expense and Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Income vs Expenses</h3>
          <IncomeExpensePieChart stats={stats} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Spending by Category</h3>
          <CategorySpendingChart stats={stats} />
        </div>
      </div>

      {/* Second Row - Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Monthly Trends</h3>
          <MonthlyTrendChart stats={stats} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Spending (Current Month)</h3>
          <DailySpendingChart dailyStats={dailyStats} />
        </div>
      </div>
    </div>
  );
};
