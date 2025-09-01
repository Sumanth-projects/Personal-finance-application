"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import TransactionFormModal from "@/components/TransactionFormModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Upload
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction, Category, dashboardApi } from "@/lib/api";
import BulkImportModal from "@/components/BulkImportModal";

// API functions for transactions
const transactionsApi = dashboardApi;

interface TransactionFilters {
  search: string;
  categoryId: string;
  type: string;
  startDate: string;
  endDate: string;
  sort: string;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    categoryId: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
    sort: '-date', // Default sort by date descending
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const params: any = {
        page,
        limit: 12,
        // Only include non-default filter values
        ...(filters.search && { search: filters.search }),
        ...(filters.categoryId !== 'all' && { categoryId: filters.categoryId }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      // Parse sort parameter into sortBy and sortOrder
      if (filters.sort) {
        if (filters.sort.startsWith('-')) {
          params.sortBy = filters.sort.substring(1);
          params.sortOrder = 'desc';
        } else {
          params.sortBy = filters.sort;
          params.sortOrder = 'asc';
        }
      }

      const data = await transactionsApi.getTransactions(params);
      
      console.log('Fetched transactions data:', data);
      console.log('First transaction categoryId:', data.transactions?.[0]?.categoryId);
      
      setTransactions(data.transactions || []);
      setCurrentPage(data.pagination?.current || 1);
      setTotalPages(data.pagination?.pages || 1);
      setTotalTransactions(data.pagination?.total || 0);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesData = await transactionsApi.getCategories();
      setCategories(categoriesData || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]); // Set empty array as fallback
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [filters]);

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categoryId: 'all',
      type: 'all',
      startDate: '',
      endDate: '',
      sort: '-date',
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      setIsDeleting(id);
      await transactionsApi.deleteTransaction(id);
      await fetchTransactions(currentPage);
    } catch (err: any) {
      setError(err.message || 'Failed to delete transaction');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: user?.preferences?.currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryName = (transaction: Transaction) => {
    console.log('Getting category name for transaction:', {
      id: transaction._id,
      categoryId: transaction.categoryId,
      type: typeof transaction.categoryId
    });
    
    // If categoryId is populated (object), use it directly
    if (typeof transaction.categoryId === 'object' && transaction.categoryId) {
      console.log('Category is populated object:', transaction.categoryId.name);
      return transaction.categoryId.name;
    }
    
    // If categoryId is a string, look it up in categories array
    if (typeof transaction.categoryId === 'string') {
      if (!Array.isArray(categories)) {
        console.log('Categories is not an array:', categories);
        return 'Uncategorized';
      }
      
      console.log('Looking for category:', transaction.categoryId, 'in categories:', categories.map(c => ({ id: c._id, name: c.name })));
      const category = categories.find(c => c._id === transaction.categoryId);
      console.log('Found category:', category);
      
      return category?.name || 'Uncategorized';
    }
    
    console.log('No category found, returning Uncategorized');
    return 'Uncategorized';
  };

  const getCategoryColor = (transaction: Transaction) => {
    // If categoryId is populated (object), use it directly
    if (typeof transaction.categoryId === 'object' && transaction.categoryId) {
      return transaction.categoryId.color || '#6b7280';
    }
    
    // If categoryId is a string, look it up in categories array
    if (typeof transaction.categoryId === 'string') {
      if (!Array.isArray(categories)) return '#6b7280';
      const category = categories.find(c => c._id === transaction.categoryId);
      return category?.color || '#6b7280';
    }
    
    return '#6b7280';
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchTransactions(currentPage)}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="mt-2 text-muted-foreground">
              Manage and view all your financial transactions
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" onClick={() => fetchTransactions(currentPage)}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <TransactionFormModal
              mode="create"
              categories={categories}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              }
              onSuccess={() => {
                fetchTransactions(currentPage);
              }}
            />
            <Button 
              variant="outline" 
              onClick={() => setShowBulkImport(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Add Multiple Transactions</span>
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Page</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentPage} of {totalPages}</div>
              <p className="text-xs text-muted-foreground">
                Showing {transactions.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {[
                  filters.search,
                  filters.categoryId !== 'all' ? filters.categoryId : '',
                  filters.type !== 'all' ? filters.type : '',
                  filters.startDate,
                  filters.endDate
                ].filter(Boolean).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Filters applied
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Filter transactions by various criteria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search description..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={filters.categoryId} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {Array.isArray(categories) && categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort">Sort by</Label>
                  <Select value={filters.sort} onValueChange={(value) => handleFilterChange('sort', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-date">Date (Newest first)</SelectItem>
                      <SelectItem value="date">Date (Oldest first)</SelectItem>
                      <SelectItem value="-amount">Amount (Highest first)</SelectItem>
                      <SelectItem value="amount">Amount (Lowest first)</SelectItem>
                      <SelectItem value="description">Description (A-Z)</SelectItem>
                      <SelectItem value="-description">Description (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {totalTransactions > 0 
                ? `Showing ${transactions.length} of ${totalTransactions} transactions`
                : 'No transactions found'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading transactions...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No transactions found</h3>
                <p className="text-muted-foreground mb-4">
                  {[
                    filters.search,
                    filters.categoryId !== 'all' ? filters.categoryId : '',
                    filters.type !== 'all' ? filters.type : '',
                    filters.startDate,
                    filters.endDate
                  ].filter(Boolean).length > 0
                    ? 'Try adjusting your filters or search criteria.'
                    : 'Get started by adding your first transaction.'
                  }
                </p>
                <TransactionFormModal
                  mode="create"
                  categories={categories}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
                    </Button>
                  }
                  onSuccess={() => {
                    fetchTransactions(currentPage);
                  }}
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction._id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getTransactionIcon(transaction.type)}
                              <Badge 
                                variant={transaction.type === 'income' ? 'default' : 'destructive'}
                                className="capitalize"
                              >
                                {transaction.type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              {transaction.notes && (
                                <div className="text-sm text-muted-foreground">{transaction.notes}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getCategoryColor(transaction) }}
                              ></div>
                              <span>{getCategoryName(transaction)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {transaction.paymentMethod?.replace('_', ' ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <TransactionFormModal
                                mode="edit"
                                transaction={transaction}
                                categories={categories}
                                trigger={
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                                onSuccess={() => {
                                  fetchTransactions(currentPage);
                                }}
                              />
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction._id)}
                                disabled={isDeleting === transaction._id}
                              >
                                {isDeleting === transaction._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = currentPage - 1;
                          setCurrentPage(newPage);
                          fetchTransactions(newPage);
                        }}
                        disabled={currentPage <= 1 || isLoading}
                      >
                        Previous
                      </Button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, currentPage - 2) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setCurrentPage(pageNum);
                              fetchTransactions(pageNum);
                            }}
                            disabled={isLoading}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = currentPage + 1;
                          setCurrentPage(newPage);
                          fetchTransactions(newPage);
                        }}
                        disabled={currentPage >= totalPages || isLoading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          fetchTransactions(currentPage);
          setShowBulkImport(false);
        }}
      />
    </MainLayout>
  );
}
