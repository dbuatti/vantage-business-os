"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  X,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

interface TransactionImporterProps {
  onImport: (data: any[]) => Promise<ImportResult>;
  existingTransactions?: Array<{ transaction_date: string; description: string; amount: number }>;
}

const TransactionImporter = ({ onImport, existingTransactions = [] }: TransactionImporterProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSVDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      if (dateStr.includes('-')) return dateStr;
      return '';
    } catch {
      return '';
    }
  };

  const parseAmount = (val: string | undefined): number | null => {
    if (!val) return null;
    const cleaned = val.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const generateSignature = (t: { transaction_date: string; description: string; amount: number }) => {
    return `${t.transaction_date}-${t.description.toLowerCase().trim()}-${t.amount.toFixed(2)}`;
  };

  // Derive mmm-yyyy from a date string like 2022-07-01
  const deriveMonthYear = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
      return '';
    }
  };

  // Derive month_code (YYYYMM) from date
  const deriveMonthCode = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${date.getFullYear()}${month}`;
    } catch {
      return '';
    }
  };

  // Derive month_name from date
  const deriveMonthName = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long' });
    } catch {
      return '';
    }
  };

  // Derive week number from date
  const deriveWeek = (dateStr: string): number => {
    if (!dateStr) return 0;
    try {
      const date = new Date(dateStr);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
      return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    } catch {
      return 0;
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setProgress(10);
    setResult(null);
    setPreview(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setProgress(50);
        
        try {
          const existingSignatures = new Set(
            existingTransactions.map(t => generateSignature(t))
          );

          const parsedData = results.data.map((row: any) => {
            // Handle different column name variations across years
            const credit = parseAmount(row['Credit'] || row['credit']);
            const debit = parseAmount(row['Debit'] || row['debit']);
            const dollarAmount = parseAmount(row['$'] || row['Amount']);
            
            let amount = dollarAmount;
            if (amount === null) {
              amount = (credit || 0) - (debit || 0);
            }

            const transactionDate = parseCSVDate(row['Date'] || row['date']);
            
            // Handle Work column - default to false if missing
            const workValue = (row['Work'] || row['work'] || '').toLowerCase().trim();
            const isWork = workValue === 'yes' || workValue === 'true' || workValue === '1';
            
            // Derive month info from date if MONTH column is missing
            const monthCode = row['MONTH'] || row['month'] || deriveMonthCode(transactionDate);
            const mmmYyyy = row['mmm-yyyy'] || row['mmm_yyyy'] || deriveMonthYear(transactionDate);
            const monthName = row['MONTH (2)'] || deriveMonthName(transactionDate);

            return {
              transaction_date: transactionDate,
              description: (row['Description'] || row['description'] || '').trim(),
              credit: credit,
              debit: debit,
              amount: amount,
              account_identifier: (row['Account'] || row['account'] || '').trim(),
              account_label: (row['Account_1'] || row['Account 1'] || row['Account'] || row['account'] || '').trim(),
              category_1: (row['Category 1'] || row['Category 1'] || row['category_1'] || '').trim(),
              category_2: (row['Category 2'] || row['Category 2'] || row['category_2'] || '').trim(),
              is_work: isWork,
              notes: (row['Notes'] || row['notes'] || '').trim(),
              week: parseInt(row['Week'] || row['week']) || deriveWeek(transactionDate),
              month_code: monthCode,
              month_name: monthName,
              mmm_yyyy: mmmYyyy,
              _isDuplicate: false
            };
          }).filter(t => t.transaction_date && t.description);

          parsedData.forEach(t => {
            const sig = generateSignature(t);
            t._isDuplicate = existingSignatures.has(sig);
          });

          setProgress(80);
          setParsedData(parsedData);
          setPreview(parsedData.slice(0, 5));
          setProgress(100);
          setImporting(false);
        } catch (error: any) {
          setImporting(false);
          setResult({
            total: 0,
            imported: 0,
            duplicates: 0,
            errors: 1
          });
        }
      },
      error: () => {
        setImporting(false);
        setResult({
          total: 0,
          imported: 0,
          duplicates: 0,
          errors: 1
        });
      }
    });
  };

  const confirmImport = async () => {
    if (!parsedData) return;
    
    setImporting(true);
    setProgress(30);

    const newData = parsedData.filter(t => !t._isDuplicate);
    const duplicates = parsedData.filter(t => t._isDuplicate).length;

    if (newData.length === 0) {
      setResult({
        total: parsedData.length,
        imported: 0,
        duplicates,
        errors: 0
      });
      setImporting(false);
      setPreview(null);
      setParsedData(null);
      return;
    }

    setProgress(60);
    const importResult = await onImport(newData);
    setProgress(100);
    
    setResult({
      ...importResult,
      duplicates: duplicates + importResult.duplicates
    });
    setImporting(false);
    setPreview(null);
    setParsedData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setImporting(true);
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImporting(true);
      processFile(file);
    }
  };

  const clearAll = () => {
    setResult(null);
    setFileName('');
    setPreview(null);
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Import Transactions
        </CardTitle>
        <CardDescription>
          Upload a CSV file — supports 2022, 2023, and 2024 formats. Duplicates are automatically detected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview && !result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
              isDragging ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50 hover:bg-muted/50",
              importing && "pointer-events-none opacity-50"
            )}
            onClick={() => !importing && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={importing}
            />
            
            {importing ? (
              <div className="space-y-4">
                <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                <div className="space-y-2">
                  <p className="font-medium">Processing {fileName}...</p>
                  <Progress value={progress} className="h-2 w-48 mx-auto" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Drop your CSV file here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>Supports: Date, Description, Credit, Debit, Category, Work columns</span>
                </div>
              </div>
            )}
          </div>
        )}

        {preview && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="font-medium">Preview: {fileName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-emerald-600 font-medium">
                  {parsedData.filter(t => !t._isDuplicate).length} new
                </span>
                <span className="text-amber-600 font-medium">
                  {parsedData.filter(t => t._isDuplicate).length} duplicates
                </span>
              </div>
            </div>

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((t, i) => (
                    <TableRow key={i} className={cn(t._isDuplicate && "opacity-50 bg-amber-50/50")}>
                      <TableCell className="text-sm">{t.transaction_date}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
                      <TableCell className="text-sm">{t.category_1}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                      <TableCell>
                        {t._isDuplicate ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Skip
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            New
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedData.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing 5 of {parsedData.length} rows
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={clearAll} className="rounded-xl">
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button onClick={confirmImport} className="rounded-xl" disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Import {parsedData.filter(t => !t._isDuplicate).length} Transactions
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="text-center space-y-4 py-4">
            {result.errors > 0 ? (
              <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
            ) : (
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-lg">Import Complete</p>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-emerald-600 font-medium">{result.imported} imported</span>
              {result.duplicates > 0 && (
                <span className="text-amber-600 font-medium">{result.duplicates} skipped</span>
              )}
              {result.errors > 0 && (
                <span className="text-rose-600 font-medium">{result.errors} errors</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll} className="rounded-xl">
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionImporter;