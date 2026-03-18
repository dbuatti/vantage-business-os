"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Papa from 'papaparse';

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

interface TransactionImporterProps {
  onImport: (data: any[]) => Promise<ImportResult>;
  existingDates?: string[];
}

const TransactionImporter = ({ onImport, existingDates = [] }: TransactionImporterProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSVDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      // Handle DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
      // Handle YYYY-MM-DD format
      if (dateStr.includes('-')) {
        return dateStr;
      }
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

  const processFile = async (file: File) => {
    setFileName(file.name);
    setImporting(true);
    setProgress(10);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setProgress(30);
        
        try {
          const parsedData = results.data.map((row: any) => {
            const credit = parseAmount(row['Credit']);
            const debit = parseAmount(row['Debit']);
            const dollarAmount = parseAmount(row['$']);
            
            // Calculate amount: use $ column if available, otherwise credit - debit
            let amount = dollarAmount;
            if (amount === null) {
              amount = (credit || 0) - (debit || 0);
            }

            const transactionDate = parseCSVDate(row['Date']);
            
            return {
              transaction_date: transactionDate,
              description: row['Description']?.trim() || '',
              credit: credit,
              debit: debit,
              amount: amount,
              account_identifier: row['Account']?.trim() || '',
              account_label: row['Account_1']?.trim() || row['Account']?.trim() || '',
              category_1: row['Category 1']?.trim() || '',
              category_2: row['Category 2']?.trim() || '',
              is_work: row['Work']?.toLowerCase()?.trim() === 'yes',
              notes: row['Notes']?.trim() || '',
              week: parseInt(row['Week']) || 0,
              month_code: row['MONTH']?.trim() || '',
              month_name: row['MONTH (2)']?.trim() || '',
              mmm_yyyy: row['mmm-yyyy']?.trim() || ''
            };
          }).filter(t => t.transaction_date && t.description);

          setProgress(60);

          // Call the import handler
          const importResult = await onImport(parsedData);
          setProgress(100);
          setResult(importResult);
        } catch (error: any) {
          setResult({
            total: 0,
            imported: 0,
            duplicates: 0,
            errors: 1
          });
        } finally {
          setImporting(false);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const clearResult = () => {
    setResult(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Import Transactions
        </CardTitle>
        <CardDescription>
          Upload a CSV file from your bank or financial app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
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
                <p className="font-medium">Importing {fileName}...</p>
                <Progress value={progress} className="h-2 w-48 mx-auto" />
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {result.errors > 0 ? (
                <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
              ) : (
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              )}
              <div className="space-y-1">
                <p className="font-bold text-lg">Import Complete</p>
                <p className="text-sm text-muted-foreground">{fileName}</p>
              </div>
              <div className="flex justify-center gap-4 text-sm">
                <span className="text-emerald-600 font-medium">{result.imported} imported</span>
                {result.duplicates > 0 && (
                  <span className="text-amber-600 font-medium">{result.duplicates} duplicates</span>
                )}
                {result.errors > 0 && (
                  <span className="text-rose-600 font-medium">{result.errors} errors</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearResult} className="rounded-xl">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
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

        {/* Format Help */}
        <div className="bg-muted/50 rounded-xl p-4 text-sm">
          <p className="font-medium mb-2">Expected CSV Format:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
            <span>• Date (DD/MM/YYYY)</span>
            <span>• Description</span>
            <span>• Credit / Debit</span>
            <span>• Category 1 / Category 2</span>
            <span>• Account</span>
            <span>• Work (Yes/No)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionImporter;