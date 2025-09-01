import React, { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { dashboardApi, DashboardStats, MonthlySummary } from '@/lib/api';
import { Loader2, Calendar, TrendingUp, PieChart as PieChartIcon, BarChart3, Clock, Filter } from 'lucide-react';

interface ChartProps {
  stats: DashboardStats;
  dailyStats?: DashboardStats | null;
  monthlySummary: MonthlySummary;
}

// Custom colors for consistent theming
const COLORS = ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#059669', '#0d9488'];

// Enhanced Income vs Expense Pie Chart with date filtering
export const FilterableIncomeExpensePieChart: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllTime, setShowAllTime] = useState(true); // Default to all-time data

  const fetchFilteredData = async (month: number, year: number, allTime: boolean = false) => {
    try {
      setIsLoading(true);
      
      let stats;
      if (allTime) {
        // Fetch all-time data (no date filtering)
        stats = await dashboardApi.getStats({ groupBy: 'type' });
      } else {
        // Fetch filtered data for specific month/year
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        // Fix: Get the last day of the month correctly
        const daysInMonth = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
        
        console.log('📅 Date range for pie chart:', { startDate, endDate, month, year, daysInMonth });
        
        stats = await dashboardApi.getStats({ 
          startDate, 
          endDate, 
          groupBy: 'type' 
        });
      }

      const data = stats.totals.map((item: any) => ({
        name: item._id === 'income' ? 'Income' : 'Expense',
        value: item.total,
        count: item.count,
        fill: item._id === 'income' ? '#10b981' : '#ef4444'
      }));

      setFilteredData(data);
    } catch (error) {
      console.error('Error fetching filtered pie chart data:', error);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredData(selectedMonth, selectedYear, showAllTime);
  }, [selectedMonth, selectedYear, showAllTime]);

  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowAllTime(false); // Switch to filtered mode when date is changed
  };

  const handleShowAllTime = () => {
    setShowAllTime(true);
    fetchFilteredData(selectedMonth, selectedYear, true);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PieChartIcon className="h-5 w-5" />
            <CardTitle>Income vs Expenses</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showAllTime ? "default" : "outline"}
              size="sm"
              onClick={handleShowAllTime}
            >
              <Clock className="h-4 w-4 mr-1" />
              All Time
            </Button>
            <Button
              variant={!showAllTime ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllTime(false)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
        <CardDescription>
          {showAllTime ? 'Total income and expenses across all time' : `Income and expenses for ${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
        </CardDescription>
        {!showAllTime && (
          <MonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onDateChange={handleDateChange}
            className="mt-4"
          />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading chart data...</span>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={filteredData}
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
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <div className="text-sm text-muted-foreground">
                Total: {formatCurrency(total)}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {filteredData.map((item, index) => (
                  <div key={index} className="flex items-center justify-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-sm">
                      {item.name}: {item.count} transactions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <Calendar className="h-8 w-8 mr-2" />
            <span>No data available for selected period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Enhanced Category Spending Chart with date filtering
export const FilterableCategorySpendingChart: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllTime, setShowAllTime] = useState(true); // Default to all-time data

  const fetchFilteredData = async (month: number, year: number, allTime: boolean = false) => {
    try {
      setIsLoading(true);
      
      let stats;
      if (allTime) {
        // Fetch all-time data (no date filtering)
        stats = await dashboardApi.getStats({ groupBy: 'category' });
      } else {
        // Fetch filtered data for specific month/year
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        // Fix: Get the last day of the month correctly
        const daysInMonth = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
        
        console.log('📅 Date range for category chart:', { startDate, endDate, month, year, daysInMonth });
        
        stats = await dashboardApi.getStats({ 
          startDate, 
          endDate, 
          groupBy: 'category' 
        });
      }

      const expenseData = stats.categoryStats
        .filter((cat: any) => cat._id.type === 'expense')
        .slice(0, 8) // Top 8 categories
        .map((cat: any) => ({
          name: cat._id.categoryName.length > 15 
            ? cat._id.categoryName.substring(0, 15) + '...' 
            : cat._id.categoryName,
          fullName: cat._id.categoryName,
          amount: cat.totalAmount,
          count: cat.count,
          fill: cat._id.categoryColor
        }))
        .sort((a: any, b: any) => b.amount - a.amount);

      setFilteredData(expenseData);
    } catch (error) {
      console.error('Error fetching filtered category data:', error);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredData(selectedMonth, selectedYear, showAllTime);
  }, [selectedMonth, selectedYear, showAllTime]);

  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowAllTime(false); // Switch to filtered mode when date is changed
  };

  const handleShowAllTime = () => {
    setShowAllTime(true);
    fetchFilteredData(selectedMonth, selectedYear, true);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const totalSpent = filteredData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Expenses by Category</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showAllTime ? "default" : "outline"}
              size="sm"
              onClick={handleShowAllTime}
            >
              <Clock className="h-4 w-4 mr-1" />
              All Time
            </Button>
            <Button
              variant={!showAllTime ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllTime(false)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filter
            </Button>
          </div>
        </div>
        <CardDescription>
          {showAllTime ? 'Top expense categories across all time' : `Top expense categories for ${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
        </CardDescription>
        {!showAllTime && (
          <MonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onDateChange={handleDateChange}
            className="mt-4"
          />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading chart data...</span>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                  formatter={(value: number, name, props) => [
                    formatCurrency(value), 
                    'Amount'
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? `${item.fullName}` : label;
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border border-border p-3 rounded-lg shadow-lg">
                          <p className="font-medium text-foreground">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Amount: {formatCurrency(data.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Transactions: {data.count}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" fill="#8884d8">
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Total Expenses: {formatCurrency(totalSpent)}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <Calendar className="h-8 w-8 mr-2" />
            <span>No expense data available for selected period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Monthly Trend Chart (unchanged - shows all months)
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
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <CardTitle>Monthly Trends</CardTitle>
        </div>
        <CardDescription>All-time income, expenses, and running balance</CardDescription>
      </CardHeader>
      <CardContent>
        {processedData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No monthly trend data</p>
              <p className="text-sm">Start adding transactions to see your monthly trends</p>
            </div>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};

// Daily Spending Area Chart (DEPRECATED - use FilterableDailySpendingChart instead)
// This component is kept for backward compatibility but not used in the main dashboard
export const DailySpendingChart: React.FC<{ dailyStats?: DashboardStats | null }> = ({ dailyStats }) => {
  if (!dailyStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending (Current Month)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Daily data not available</p>
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Spending (Current Month)</CardTitle>
        <CardDescription>Daily expense trends for this month</CardDescription>
      </CardHeader>
      <CardContent>
        {dailyData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No daily spending data available</p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};

// Enhanced Dashboard Charts Component
export const EnhancedDashboardCharts: React.FC<ChartProps> = ({ stats, dailyStats, monthlySummary }) => {
  if (!stats || !stats.totals.length) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-6 text-muted-foreground/50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Data Available</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                It looks like you haven't added any transactions yet. Start by adding your income and expenses to see your financial insights.
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Track your income and expenses</p>
                <p>• View spending by category</p>
                <p>• Monitor monthly trends</p>
                <p>• Analyze daily spending patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* First Row - Enhanced Filterable Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FilterableIncomeExpensePieChart />
        <FilterableCategorySpendingChart />
      </div>

      {/* Second Row - Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyTrendChart stats={stats} />
        <FilterableDailySpendingChart />
      </div>
    </div>
  );
};

// Enhanced Daily Spending Chart with date filtering
export const FilterableDailySpendingChart: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllTime, setShowAllTime] = useState(false); // Default to current month for daily view

  const fetchDailyData = async (month: number, year: number, allTime: boolean = false) => {
    try {
      setIsLoading(true);
      
      let stats;
      if (allTime) {
        // Fetch all-time daily data (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        stats = await dashboardApi.getStats({ 
          groupBy: 'day',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
      } else {
        // Fetch data for specific month/year
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of the month
        
        stats = await dashboardApi.getStats({ 
          groupBy: 'day',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        });
      }

      // Process daily expense data
      const processedData = stats.stats
        .filter((item: any) => item._id.day && item._id.type === 'expense')
        .map((item: any) => ({
          day: `${item._id.month}/${item._id.day}`,
          amount: item.totalAmount,
          count: item.count,
          date: new Date(item._id.year, (item._id.month || 1) - 1, item._id.day || 1),
          displayDate: `${item._id.month?.toString().padStart(2, '0')}/${item._id.day?.toString().padStart(2, '0')}`
        }))
        .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

      setDailyData(processedData);
    } catch (error) {
      console.error('Error fetching daily data:', error);
      setDailyData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData(selectedMonth, selectedYear, showAllTime);
  }, [selectedMonth, selectedYear, showAllTime]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const totalSpending = dailyData.reduce((sum, item) => sum + item.amount, 0);
  const averageDaily = dailyData.length > 0 ? totalSpending / dailyData.length : 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        {/* Title Section */}
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Daily Spending Trends</CardTitle>
            <CardDescription>
              {showAllTime 
                ? 'Daily expenses over the last 30 days'
                : `Daily expenses for ${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`
              }
            </CardDescription>
          </div>
        </div>
        
        {/* Filter Section */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Filter by:
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showAllTime ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllTime(!showAllTime)}
              className="flex items-center space-x-1"
            >
              <Filter className="h-4 w-4" />
              <span>{showAllTime ? "Last 30 Days" : "Monthly"}</span>
            </Button>
            {!showAllTime && (
              <MonthYearPicker
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onDateChange={(month, year) => {
                  setSelectedMonth(month);
                  setSelectedYear(year);
                }}
              />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading daily data...</span>
          </div>
        ) : dailyData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No daily spending data</p>
              <p className="text-sm">
                {showAllTime 
                  ? 'No expenses found in the last 30 days' 
                  : `No expenses found for ${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Period Spending</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(totalSpending)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Daily Average</p>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(averageDaily)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Days with Spending</p>
                <p className="text-lg font-semibold text-foreground">{dailyData.length}</p>
              </div>
            </div>

            {/* Area Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tickFormatter={formatCurrency} 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Daily Spending']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name="Daily Spending"
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Additional insights */}
            {dailyData.length > 0 && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Highest spending day: </span>
                    <span className="font-medium">
                      {(() => {
                        const maxDay = dailyData.reduce((max, day) => day.amount > max.amount ? day : max);
                        return `${maxDay.displayDate} (${formatCurrency(maxDay.amount)})`;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lowest spending day: </span>
                    <span className="font-medium">
                      {(() => {
                        const minDay = dailyData.reduce((min, day) => day.amount < min.amount ? day : min);
                        return `${minDay.displayDate} (${formatCurrency(minDay.amount)})`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Export both versions for flexibility
export const DashboardCharts = EnhancedDashboardCharts;
