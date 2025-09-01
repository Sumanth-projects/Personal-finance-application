'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { dashboardApi } from '@/lib/api';
import { Loader2, Calendar, PieChart, Clock, TrendingDown } from 'lucide-react';

interface FilterableCategoryBreakdownProps {
  className?: string;
}

export const FilterableCategoryBreakdown: React.FC<FilterableCategoryBreakdownProps> = ({ 
  className = '' 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllTime, setShowAllTime] = useState(true); // Default to all-time data
  const [totalExpense, setTotalExpense] = useState(0);

  const fetchCategoryData = async (month: number, year: number, allTime: boolean = false) => {
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
        
        console.log('📅 Date range for category breakdown:', { startDate, endDate, month, year, daysInMonth });
        
        stats = await dashboardApi.getStats({ 
          startDate, 
          endDate, 
          groupBy: 'category' 
        });
      }

      // Filter and process expense categories
      const expenseCategories = stats.categoryStats
        .filter((cat: any) => cat._id.type === 'expense')
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
        .slice(0, 5); // Top 5 categories

      setCategoryData(expenseCategories);
      
      // Calculate total expenses for percentage calculations
      const total = expenseCategories.reduce((sum: number, cat: any) => sum + cat.totalAmount, 0);
      setTotalExpense(total);
      
    } catch (error) {
      console.error('Error fetching category breakdown data:', error);
      setCategoryData([]);
      setTotalExpense(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData(selectedMonth, selectedYear, showAllTime);
  }, [selectedMonth, selectedYear, showAllTime]);

  const handleDateChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setShowAllTime(false); // Switch to filtered mode when date is changed
  };

  const handleShowAllTime = () => {
    setShowAllTime(true);
    fetchCategoryData(selectedMonth, selectedYear, true);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const getTimeRangeText = () => {
    if (showAllTime) {
      return 'All Time';
    }
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <CardTitle>Spending by Category</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showAllTime ? "default" : "outline"}
              size="sm"
              onClick={handleShowAllTime}
              className="h-8"
            >
              <Clock className="h-3 w-3 mr-1" />
              All Time
            </Button>
            <Button
              variant={!showAllTime ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllTime(false)}
              className="h-8"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Filter
            </Button>
          </div>
        </div>
        <CardDescription>
          {showAllTime ? 'Your top spending categories across all time' : `Top spending categories for ${getTimeRangeText()}`}
        </CardDescription>
        
        {/* Month/Year Picker - only show when not in all-time mode */}
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
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading category data...</span>
          </div>
        ) : categoryData.length > 0 ? (
          <>
            <div className="space-y-4">
              {categoryData.map((category) => {
                const percentage = totalExpense > 0 ? (category.totalAmount / totalExpense) * 100 : 0;
                return (
                  <div key={category._id.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category._id.categoryColor }}
                        ></div>
                        <span className="font-medium">{category._id.categoryName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({category.count} transactions)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(category.totalAmount)}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          backgroundColor: category._id.categoryColor, 
                          width: `${percentage}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Expenses</span>
                  <span className="text-xs text-muted-foreground">({getTimeRangeText()})</span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Showing top {categoryData.length} spending categories
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <PieChart className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No expense data available</p>
              <p className="text-xs">
                {showAllTime ? 'No transactions found' : `No expenses in ${getTimeRangeText()}`}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
