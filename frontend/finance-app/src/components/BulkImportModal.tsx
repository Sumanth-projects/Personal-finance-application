"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  categoryName: string;
  type: 'income' | 'expense';
  isValid: boolean;
  errors?: string[];
}

interface ImportResult {
  imported: number;
  errors: number;
  transactions: any[];
  errorDetails: any[];
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const { logout } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<'select' | 'preview' | 'uploading' | 'result'>('select');
  const [previewData, setPreviewData] = useState<ParsedTransaction[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const parseCSVPreview = (file: File): Promise<ParsedTransaction[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            reject(new Error('File must contain at least a header row and one data row'));
            return;
          }

          // Skip header row
          const dataLines = lines.slice(1);
          const parsed: ParsedTransaction[] = [];

          dataLines.forEach((line, index) => {
            const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
            
            if (parts.length >= 3) {
              const dateStr = parts[0];
              const description = parts[1];
              const amountStr = parts[2].replace(/[$,]/g, '');
              const categoryName = parts[3] || 'Imported';
              
              // Validate data
              const errors: string[] = [];
              const date = new Date(dateStr);
              const amount = Math.abs(parseFloat(amountStr));
              
              if (isNaN(date.getTime())) {
                errors.push('Invalid date format');
              }
              if (isNaN(amount) || amount === 0) {
                errors.push('Invalid amount');
              }
              if (!description.trim()) {
                errors.push('Missing description');
              }

              const type = amountStr.includes('-') || description.toLowerCase().includes('payment') 
                ? 'expense' 
                : 'income';

              parsed.push({
                date: dateStr,
                description: description.trim(),
                amount,
                categoryName: categoryName.trim(),
                type,
                isValid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined
              });
            }
          });

          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError(null);
      
      // First, parse and preview the data
      const preview = await parseCSVPreview(selectedFile);
      setPreviewData(preview);
      setUploadStage('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadStage('uploading');
      setError(null);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Get auth token (using same pattern as api.ts)
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Upload to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/transaction-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token is invalid or expired
          logout(); // Clear local auth state
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(result.message || 'Upload failed');
      }

      setImportResult(result.data);
      setUploadStage('result');
      
      // Call success callback to refresh transactions list
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to import transactions');
      setUploadStage('preview');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUploadStage('select');
    setPreviewData([]);
    setImportResult(null);
    setError(null);
    onClose();
  };

  const validTransactions = previewData.filter(t => t.isValid);
  const invalidTransactions = previewData.filter(t => !t.isValid);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Bulk Import Transactions</span>
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple transactions at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* File Selection Stage */}
          {uploadStage === 'select' && (
            <div className="space-y-6">
              {/* CSV Format Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Required CSV Format</CardTitle>
                  <CardDescription>
                    Your CSV file should have the following columns:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    Date,Description,Amount,Category<br/>
                    2024-08-01,McDonald's Lunch,-12.50,Food & Dining<br/>
                    2024-08-01,Salary Deposit,3500.00,Salary<br/>
                    2024-08-02,Gas Station,-65.00,Transportation
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <strong>Notes:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Use negative amounts (-12.50) for expenses</li>
                      <li>Use positive amounts (3500.00) for income</li>
                      <li>Date format: YYYY-MM-DD, MM/DD/YYYY, or DD/MM/YYYY</li>
                      <li>Categories will be created automatically if they don't exist</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* File Upload */}
              <div className="space-y-4">
                <Label htmlFor="csv-file">Select CSV File</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleFileUpload}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </>
                    )}
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview Stage */}
          {uploadStage === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Valid Transactions</p>
                        <p className="text-lg font-semibold">{validTransactions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Invalid Transactions</p>
                        <p className="text-lg font-semibold">{invalidTransactions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Rows</p>
                        <p className="text-lg font-semibold">{previewData.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Transaction Preview</CardTitle>
                  <CardDescription>
                    Review the transactions before importing. Only valid transactions will be imported.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((transaction, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {transaction.isValid ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  Valid
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  Invalid
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>
                              <span className={transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                                {transaction.type === 'expense' ? '-' : '+'}${transaction.amount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>{transaction.categoryName}</TableCell>
                            <TableCell>
                              <Badge variant={transaction.type === 'expense' ? 'destructive' : 'default'}>
                                {transaction.type}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setUploadStage('select')}>
                  Back to File Selection
                </Button>
                <Button 
                  onClick={handleConfirmImport}
                  disabled={validTransactions.length === 0 || isUploading}
                >
                  Import {validTransactions.length} Transactions
                </Button>
              </div>
            </div>
          )}

          {/* Uploading Stage */}
          {uploadStage === 'uploading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h3 className="text-lg font-semibold">Importing Transactions...</h3>
              <p className="text-muted-foreground">Please wait while we process your file</p>
            </div>
          )}

          {/* Result Stage */}
          {uploadStage === 'result' && importResult && (
            <div className="space-y-6">
              {/* Success Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Import Complete!</span>
                  </CardTitle>
                  <CardDescription>
                    Your transactions have been successfully imported
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Successfully Imported</p>
                      <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Errors</p>
                      <p className="text-2xl font-bold text-orange-600">{importResult.errors}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-center">
                <Button onClick={handleClose}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
