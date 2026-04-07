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
  Eye,
  Tags
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
import ImportCategoryMapper from './ImportCategoryMapper';

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

interface TransactionImporterProps {
  onImport: (data: any[], newMappings?: Record<string, string>) => Promise<ImportResult>;
  existingTransactions?: Array<{ transaction_date: string; description: string; amount: number }>;
  existingCategoryGroups?: Array<{ category_name: string }>;
}

const TransactionImporter = ({ onImport, existingTransactions = [], existingCategoryGroups = [] }: TransactionImporterProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [unmappedCategories, setUnmappedCategories] = useState<string[]>([]);
  const [showMapper, setShowMapper] = useState(false);
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

          const mappedCategoryNames = new Set(existingCategoryGroups.map(g => g.category_name));

          const parsedData = results.data.map((row: any) => {
            const credit = parseAmount(row['Credit'] || row['credit']);
            const debit = parseAmount(row['Debit'] || row['debit']);
            const dollarAmount = parseAmount(row['$'] || row['Amount']);
            
            let amount = dollarAmount;
            if (amount === null) {
              amount = (credit || 0) - (debit || 0);
            }

            const transactionDate = parseCSVDate(row['Date'] || row['date']);
            const workValue = (row['Work'] || row['work'] || '').toLowerCase().trim();
            const isWork = workValue === 'yes' || workValue === 'true' || workValue === '1';

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
              week: parseInt(row['Week'] || row['week']) || 0,
              month_code: row['MONTH'] || row['month'] || '',
              month_name: row['MONTH (2)'] || '',
              mmm_yyyy: row['mmm-yyyy'] || row['mmm_yyyy'] || '',
              _isDuplicate: false
            };
          }).filter(t => t.transaction_date && t.description);

          // Detect unmapped categories
          const incomingCategories = new Set<string>(parsedData.map(t => t.category_1).filter(Boolean));
          const unmapped = Array.from(incomingCategories).filter(cat => !mappedCategoryNames.has(cat));
          setUnmappedCategories(unmapped);

          // Mark duplicates
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

  const confirmImport = async (newMappings?: Record<string, string>) => {
    if (!parsedData) return;
    
    // If we have unmapped categories and haven't shown the mapper yet, show it
    if (unmappedCategories.length > 0 && !showMapper && !newMappings) {
      setShowMapper(true);
      return;
    }

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
      setShowMapper(false);
      return;
    }

    setProgress(60);
    const importResult = await onImport(newData, newMappings);
    setProgress(100);
    
    setResult({
      ...importResult,
      duplicates: duplicates + importResult.duplicates
    });
    setImporting(false);
    setPreview(null);
    setParsedData(null);
    setShowMapper(false);
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
    setUnmappedCategories([]);
    setShowMapper(false);
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

  if (showMapper) {
    return (
      <ImportCategoryMapper 
        unmappedCategories={unmappedCategories}
        onMappingComplete={(mappings) => confirmImport(mappings)}
        onCancel={clearAll}
      />
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          Import Transactions
        </CardTitle>
        <CardDescription>
          Upload a CSV file. Duplicates are automatically detected and skipped.
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

            {unmappedCategories.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <Tags className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-800">New Categories Detected</p>
                  <p className="text-[10px] text-amber-700">You'll be asked to map {unmappedCategories.length} new categories in the next step.</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((t, i) => (
                    <TableRow key={i} className={cn(t._isDuplicate && "opacity-50 bg-amber-50/50")}>
                      <TableCell className="text-sm">{t.transaction_date}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
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
              <Button onClick={() => confirmImport()} className="rounded-xl" disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {unmappedCategories.length > 0 ? 'Next: Map Categories' : `Import ${parsedData.filter(t => !t._isDuplicate).length} Transactions`}
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