import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Dashboard API functions
export const dashboardApi = {
  // Get transaction statistics
  getStats: async (params?: { startDate?: string; endDate?: string; groupBy?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    
    const url = `${API_BASE_URL}/transactions/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data.data;
  },

  // Get monthly summary
  getMonthlySummary: async (year?: number, month?: number) => {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year.toString());
    if (month) queryParams.append('month', month.toString());
    
    const url = `${API_BASE_URL}/transactions/monthly-summary${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await axios.get(url, { headers: getAuthHeaders() });
    return response.data.data;
  },

  // Get recent transactions
  getRecentTransactions: async (limit: number = 5) => {
    const response = await axios.get(`${API_BASE_URL}/transactions?limit=${limit}&sort=-date`, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await axios.get(`${API_BASE_URL}/categories`, { headers: getAuthHeaders() });
    return response.data.data.categories; // Extract categories array from nested response
  },

  // Upload receipt
  uploadReceipt: async (file: File) => {
    const formData = new FormData();
    formData.append('receipt', file);
    
    const response = await axios.post(`${API_BASE_URL}/upload/extract-receipt`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...getAuthHeaders()
      },
    });
    return response.data;
  },

  // Get transactions with pagination and filters
  getTransactions: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });
    
    const response = await axios.get(`${API_BASE_URL}/transactions?${queryParams}`, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },

  // Delete transaction
  deleteTransaction: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/transactions/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Create transaction from receipt data
  createTransactionFromReceipt: async (receiptData: any, transactionData: any) => {
    const response = await axios.post(`${API_BASE_URL}/transactions`, {
      ...transactionData,
      receiptData,
    }, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },

  // Create transaction
  createTransaction: async (transactionData: {
    type: 'income' | 'expense';
    amount: number;
    description: string;
    categoryId: string;
    date: string;
    paymentMethod?: string;
    tags?: string[];
    notes?: string;
    currency: string;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/transactions`, transactionData, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },

  // Update transaction
  updateTransaction: async (id: string, transactionData: {
    type?: 'income' | 'expense';
    amount?: number;
    description?: string;
    categoryId?: string;
    date?: string;
    paymentMethod?: string;
    tags?: string[];
    notes?: string;
    currency?: string;
  }) => {
    const response = await axios.put(`${API_BASE_URL}/transactions/${id}`, transactionData, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  },
};

// Types for dashboard data
export interface DashboardStats {
  stats: Array<{
    _id: {
      type: 'income' | 'expense';
      year: number;
      month?: number;
      day?: number;
    };
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  totals: Array<{
    _id: 'income' | 'expense';
    total: number;
    count: number;
  }>;
  categoryStats: Array<{
    _id: {
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      type: 'income' | 'expense';
    };
    totalAmount: number;
    count: number;
  }>;
}

export interface MonthlySummary {
  period: {
    year: number;
    month: number;
  };
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
}

export interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId: string | {
    _id: string;
    name: string;
    color: string;
    icon: string;
    type: string;
  };
  date: string;
  paymentMethod?: string;
  tags?: string[];
  notes?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  color: string;
  icon: string;
  description?: string;
  isDefault: boolean;
  userId?: string;
  budget?: number;
  parentCategory?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReceiptData {
  extractedText: string;
  structuredData: {
    merchant?: string;
    total?: number;
    date?: string;
    items?: Array<{
      name: string;
      quantity?: number;
      price?: number;
    }>;
  };
  confidence: number;
}

// Re-export commonly used functions for convenience
export const getCategories = dashboardApi.getCategories;
export const getTransactions = dashboardApi.getTransactions;
export const createTransaction = dashboardApi.createTransaction;
export const updateTransaction = dashboardApi.updateTransaction;
export const deleteTransaction = dashboardApi.deleteTransaction;
export const uploadReceipt = dashboardApi.uploadReceipt;

// Category API functions
const categoryApi = {
  // Get all categories
  getCategories: async () => {
    const response = await axios.get(`${API_BASE_URL}/categories`, {
      headers: getAuthHeaders()
    });
    return response.data.data.categories;
  },

  // Get single category
  getCategory: async (id: string) => {
    const response = await axios.get(`${API_BASE_URL}/categories/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data.data.category;
  },

  // Create category
  createCategory: async (categoryData: {
    name: string;
    description?: string;
    type: 'income' | 'expense' | 'both';
    color: string;
    icon: string;
    parentCategory?: string;
    budget?: number;
  }) => {
    const response = await axios.post(`${API_BASE_URL}/categories`, categoryData, {
      headers: getAuthHeaders()
    });
    return response.data.data.category;
  },

  // Update category
  updateCategory: async (id: string, categoryData: {
    name?: string;
    description?: string;
    type?: 'income' | 'expense' | 'both';
    color?: string;
    icon?: string;
    parentCategory?: string;
    budget?: number;
  }) => {
    const response = await axios.put(`${API_BASE_URL}/categories/${id}`, categoryData, {
      headers: getAuthHeaders()
    });
    return response.data.data.category;
  },

  // Delete category
  deleteCategory: async (id: string) => {
    const response = await axios.delete(`${API_BASE_URL}/categories/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Get default categories
  getDefaultCategories: async () => {
    const response = await axios.get(`${API_BASE_URL}/categories/defaults`);
    return response.data.data.categories;
  },

  // Initialize default categories
  initializeDefaultCategories: async () => {
    const response = await axios.post(`${API_BASE_URL}/categories/initialize-defaults`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// Export the categoryApi object
export { categoryApi };

// Auth API functions
const authApi = {
  // Get current user profile
  getProfile: async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders()
    });
    return response.data.data.user;
  },

  // Update user profile
  updateProfile: async (profileData: {
    name?: string;
    preferences?: {
      currency?: string;
      dateFormat?: string;
      theme?: string;
    };
  }) => {
    const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
      headers: getAuthHeaders()
    });
    return response.data.data.user;
  },

  // Change password
  changePassword: async (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await axios.put(`${API_BASE_URL}/auth/change-password`, passwordData, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Deactivate account
  deactivateAccount: async () => {
    const response = await axios.put(`${API_BASE_URL}/auth/deactivate`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

// Export the authApi object
export { authApi };

// Export individual category functions
export const createCategory = categoryApi.createCategory;
export const updateCategory = categoryApi.updateCategory;
export const deleteCategory = categoryApi.deleteCategory;
