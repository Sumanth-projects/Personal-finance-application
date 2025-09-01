'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, X, Camera } from 'lucide-react';
import { Transaction, Category, createTransaction, updateTransaction, uploadReceipt } from '@/lib/api';

interface TransactionFormModalProps {
  mode: 'create' | 'edit';
  transaction?: Transaction;
  categories: Category[];
  trigger: React.ReactNode;
  onSuccess: () => void;
}

interface FormData {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  categoryId: string;
  date: string;
  paymentMethod: string;
  tags: string;
  notes: string;
  currency: string;
}

export default function TransactionFormModal({
  mode,
  transaction,
  categories,
  trigger,
  onSuccess
}: TransactionFormModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    type: 'expense',
    amount: '',
    description: '',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    tags: '',
    notes: '',
    currency: 'USD'
  });

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && transaction) {
      const categoryId = typeof transaction.categoryId === 'object' 
        ? transaction.categoryId._id 
        : transaction.categoryId;

      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        categoryId: categoryId,
        date: new Date(transaction.date).toISOString().split('T')[0],
        paymentMethod: transaction.paymentMethod || 'cash',
        tags: transaction.tags?.join(', ') || '',
        notes: transaction.notes || '',
        currency: transaction.currency
      });
    }
  }, [mode, transaction]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a valid image (JPG, PNG) or PDF file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setOcrLoading(true);
    setError(null);

    try {
      const ocrResult = await uploadReceipt(file);
      
      console.log('OCR Result:', ocrResult); // Debug log
      
      if (ocrResult.success && ocrResult.data && ocrResult.data.extractedData) {
        const extractedData = ocrResult.data.extractedData;
        
        // Auto-populate form with OCR data
        if (extractedData.total) {
          setFormData(prev => ({ ...prev, amount: extractedData.total.toString() }));
        }
        
        if (extractedData.storeName) {
          setFormData(prev => ({ ...prev, description: `Purchase from ${extractedData.storeName}` }));
        }
        
        if (extractedData.date) {
          const parsedDate = new Date(extractedData.date);
          if (!isNaN(parsedDate.getTime())) {
            setFormData(prev => ({ ...prev, date: parsedDate.toISOString().split('T')[0] }));
          }
        }
        
        // Build notes with OCR information
        let notesContent = '';
        
        // Add merchant info to notes if available
        if (extractedData.storeName) {
          notesContent += `Merchant: ${extractedData.storeName}`;
        }
        
        // Add items info to notes if available
        if (extractedData.items && extractedData.items.length > 0) {
          console.log('Raw items data:', extractedData.items); // Debug log
          
          const itemsText = extractedData.items.map((item: any) => {
            // Handle different item formats
            if (typeof item === 'string') {
              return item;
            } else if (typeof item === 'object' && item !== null) {
              // Try different possible properties for item name
              const itemName = item.name || item.description || item.text || item.item;
              if (itemName) {
                return itemName;
              }
              // If it's an object but no recognizable name property, stringify it nicely
              if (item.quantity && item.price) {
                return `${item.name || 'Item'} (${item.quantity}x $${item.price})`;
              }
              // Last resort - return a cleaned up version
              return Object.values(item).filter(val => val && typeof val === 'string').join(' ');
            }
            return String(item);
          }).filter(Boolean).join(', ');
          
          console.log('Processed items text:', itemsText); // Debug log
          
          if (itemsText) {
            if (notesContent) notesContent += '\n';
            notesContent += `Items: ${itemsText}`;
          }
        }
        
        // Set the complete notes at once
        if (notesContent) {
          setFormData(prev => ({ ...prev, notes: notesContent }));
        }
        
        console.log('Form populated with OCR data:', {
          amount: extractedData.total,
          description: extractedData.storeName,
          date: extractedData.date
        });
      }
    } catch (err) {
      console.error('OCR processing failed:', err);
      setError('Failed to process receipt. You can still enter details manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Please enter a description');
      return false;
    }
    if (!formData.categoryId) {
      setError('Please select a category');
      return false;
    }
    if (!formData.date) {
      setError('Please select a date');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        categoryId: formData.categoryId,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: formData.notes.trim(),
        currency: formData.currency
      };

      if (mode === 'create') {
        await createTransaction(transactionData);
      } else if (transaction) {
        await updateTransaction(transaction._id, transactionData);
      }

      onSuccess();
      setOpen(false);
      
      // Reset form for create mode
      if (mode === 'create') {
        setFormData({
          type: 'expense',
          amount: '',
          description: '',
          categoryId: '',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'cash',
          tags: '',
          notes: '',
          currency: 'USD'
        });
        setUploadedFile(null);
      }
    } catch (err: any) {
      console.error('Failed to save transaction:', err);
      setError(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Transaction' : 'Edit Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Upload Section */}
          {mode === 'create' && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Upload Receipt (Optional)</Label>
              
              {!uploadedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer">
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/jpg,image/png,application/pdf"
                          onChange={handleFileSelect}
                          id="receipt-upload"
                        />
                        <label htmlFor="receipt-upload" className="cursor-pointer">
                          Click to upload
                        </label>
                      </span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </div>
                    <p className="text-xs text-muted-foreground">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{uploadedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeUploadedFile}
                        disabled={ocrLoading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {ocrLoading && (
                      <div className="mt-3 flex items-center space-x-2 text-sm text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing receipt...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'income' | 'expense') => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => handleInputChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter transaction description"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="business, travel, food"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes or details"
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                mode === 'create' ? 'Create Transaction' : 'Update Transaction'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
