import { useState, useEffect } from 'react';
import { dashboardApi, DashboardStats, MonthlySummary, Transaction, Category } from '@/lib/api';

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DashboardStats | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current month date range
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Format dates for API
      const startDate = currentMonthStart.toISOString().split('T')[0];
      const endDate = currentMonthEnd.toISOString().split('T')[0];

      // Fetch all dashboard data in parallel
      const [statsData, dailyStatsData, summaryData, transactionsData, categoriesData] = await Promise.all([
        dashboardApi.getStats({ groupBy: 'month' }), // All-time stats for overview
        dashboardApi.getStats({ 
          groupBy: 'day', 
          startDate: startDate, 
          endDate: endDate 
        }), // Current month daily stats
        dashboardApi.getMonthlySummary(),
        dashboardApi.getRecentTransactions(5),
        dashboardApi.getCategories(),
      ]);

      setStats(statsData);
      setDailyStats(dailyStatsData);
      setMonthlySummary(summaryData);
      setRecentTransactions(transactionsData.transactions || []);
      setCategories(categoriesData || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    dailyStats,
    monthlySummary,
    recentTransactions,
    categories,
    isLoading,
    error,
    refreshData,
  };
};

export const useReceiptUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadReceipt = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      const result = await dashboardApi.uploadReceipt(file);
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to upload receipt';
      setUploadError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadReceipt,
    isUploading,
    uploadError,
  };
};
