"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import CategoryFormModal from "@/components/CategoryFormModal";
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
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Palette,
  Tag,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Grid,
  List
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Category, 
  categoryApi, 
  createCategory,
  updateCategory, 
  deleteCategory 
} from "@/lib/api";

interface CategoryFilters {
  search: string;
  type: string;
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [filters, setFilters] = useState<CategoryFilters>({
    search: '',
    type: 'all'
  });

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await categoryApi.getCategories();
      setCategories(data || []);
      console.log('Fetched categories:', data);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = categories;

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(category =>
        category.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        category.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(category => 
        category.type === filters.type || category.type === 'both'
      );
    }

    setFilteredCategories(filtered);
  }, [categories, filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof CategoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      type: 'all'
    });
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(categoryId);
      await deleteCategory(categoryId);
      await fetchCategories(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting category:', err);
      alert(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setIsDeleting(null);
    }
  };

  // Initialize default categories
  const handleInitializeDefaults = async () => {
    try {
      setIsLoading(true);
      await categoryApi.initializeDefaultCategories();
      await fetchCategories();
    } catch (err: any) {
      console.error('Error initializing default categories:', err);
      setError(err.response?.data?.message || 'Failed to initialize default categories');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: user?.preferences?.currency || 'USD',
    }).format(amount);
  };

  // Get type badge variant
  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'income': return 'default';
      case 'expense': return 'destructive';
      case 'both': return 'secondary';
      default: return 'outline';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'income': return <TrendingUp className="h-4 w-4" />;
      case 'expense': return <TrendingDown className="h-4 w-4" />;
      case 'both': return <DollarSign className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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
                onClick={fetchCategories}
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <p className="mt-2 text-muted-foreground">
              Organize your transactions with custom categories
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" onClick={fetchCategories} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <CategoryFormModal
              mode="create"
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              }
              onSuccess={fetchCategories}
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">
                Active categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Income Categories</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {categories.filter(c => c.type === 'income' || c.type === 'both').length}
              </div>
              <p className="text-xs text-muted-foreground">
                For income tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expense Categories</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {categories.filter(c => c.type === 'expense' || c.type === 'both').length}
              </div>
              <p className="text-xs text-muted-foreground">
                For expense tracking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Budgets</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {categories.filter(c => c.budget && c.budget > 0).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Have budget limits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search categories..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={filters.type}
                    onValueChange={(value) => handleFilterChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end space-x-2">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  >
                    {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Categories List/Grid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Categories</CardTitle>
              <CardDescription>
                {filteredCategories.length} of {categories.length} categories
              </CardDescription>
            </div>
            
            {categories.length === 0 && !isLoading && (
              <Button variant="outline" onClick={handleInitializeDefaults}>
                <Plus className="h-4 w-4 mr-2" />
                Initialize Default Categories
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8">
                <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {categories.length === 0 ? 'No categories yet' : 'No categories found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {categories.length === 0 
                    ? 'Create your first category to organize transactions'
                    : 'Try adjusting your filters or search criteria'
                  }
                </p>
                {categories.length === 0 && (
                  <div className="space-x-2">
                    <CategoryFormModal
                      mode="create"
                      trigger={
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Category
                        </Button>
                      }
                      onSuccess={fetchCategories}
                    />
                    <Button variant="outline" onClick={handleInitializeDefaults}>
                      <Plus className="h-4 w-4 mr-2" />
                      Use Defaults
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-4"
              }>
                {filteredCategories.map((category) => (
                  <div
                    key={category._id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                      viewMode === 'list' ? 'flex items-center justify-between' : ''
                    }`}
                  >
                    <div className={viewMode === 'grid' ? 'space-y-3' : 'flex items-center space-x-4'}>
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: category.color }}
                        >
                          <span className="text-white text-sm font-medium">
                            {category.icon?.charAt(0)?.toUpperCase() || category.name.charAt(0)}
                          </span>
                        </div>
                        <div className={viewMode === 'list' ? '' : 'flex-1'}>
                          <h3 className="font-medium text-foreground">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                          )}
                        </div>
                      </div>

                      <div className={`flex ${viewMode === 'grid' ? 'justify-between' : 'space-x-4'} items-center`}>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getTypeVariant(category.type)} className="flex items-center space-x-1">
                            {getTypeIcon(category.type)}
                            <span className="capitalize">{category.type}</span>
                          </Badge>
                          {category.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>

                        {category.budget && category.budget > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-blue-600">
                              Budget: {formatCurrency(category.budget)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`flex ${viewMode === 'grid' ? 'justify-end mt-3' : ''} space-x-2`}>
                      <CategoryFormModal
                        mode="edit"
                        category={category}
                        trigger={
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                        onSuccess={fetchCategories}
                      />
                      {!category.isDefault && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCategory(category._id)}
                          disabled={isDeleting === category._id}
                        >
                          {isDeleting === category._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
