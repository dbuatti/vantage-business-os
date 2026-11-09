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

interface ParsedTransaction {
  transaction_date: string;
  description: string;
  credit: number | null;
  debit: number | null;
  amount: number;
  account_identifier: string;
  account_label: string;
  category_1: string;
  category_2: string;
  is_work: boolean;
  notes: string;
  week: number;
  month_code: string;
  month_name: string;
  mmm_yyyy: string;
  _isDuplicate: boolean;
  _autoWork?: boolean;
  _autoNotes?: boolean;
}

// Auto-classification for FNH Byron immersion study travel.
// Rule: Category 1 = Study + transaction date in the immersion window
// upgrades is_work to Yes and fills Notes when blank. Never overwrites
// existing notes or downgrades Yes -> No.
const IMMERSION_START = '2026-10-26';
const IMMERSION_END = '2026-11-03';
const IMMERSION_TAG = 'FNH Byron immersion Oct-Nov 2026';

const extractReceipt = (desc: string): string => {
  const m = desc.match(/Receipt\s+(\d+)/i);
  return m ? m[1] : '';
};

const extractPlaceAndDate = (desc: string): { place: string; descDate: string } => {
  const m = desc.match(/In\s+(.+?)\s+Date\s+(\d{1,2}\s+\w+\s+\d{4})/i);
  if (!m) return { place: '', descDate: '' };
  const place = (m[1] || '').trim();
  // Skip numeric placeholders like "4029357733" or "8009444667"
  const isNumericPlace = /^\d+$/.test(place.replace(/\s/g, ''));
  return { place: isNumericPlace ? '' : place, descDate: (m[2] || '').trim() };
};

const isImmersionTransaction = (category_1: string, transaction_date: string): boolean => {
  if (category_1.trim().toLowerCase() !== 'study') return false;
  if (!transaction_date) return false;
  return transaction_date >= IMMERSION_START && transaction_date <= IMMERSION_END;
};

const normalizeCategory2 = (category_1: string, category_2: string): { category_2: string; noteHint: string } => {
  const cat1 = category_1.trim().toLowerCase();
  const cat2 = (category_2 || '').trim();
  const lower2 = cat2.toLowerCase();
  if (cat1 === 'study' && (lower2 === 'coffee' || lower2 === 'groceries')) {
    return { category_2: 'Food', noteHint: lower2 };
  }
  if (cat1 === 'myki' && !cat2) {
    return { category_2: 'Transport', noteHint: '' };
  }
  return { category_2: cat2, noteHint: '' };
};

interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: number;
}

interface TransactionImporterProps {
  onImport: (data: ParsedTransaction[], newMappings?: Record<string, string>) => Promise<ImportResult>;
  existingTransactions?: Array<{ transaction_date: string; description: string; amount: number }>;
  existingCategoryGroups?: Array<{ category_name: string }>;
}

const TransactionImporter = ({ onImport, existingTransactions = [], existingCategoryGroups = [] }: TransactionImporterProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<ParsedTransaction[] | null>(null);
  const [parsedData, setParsedData] = useState<ParsedTransaction[] | null>(null);
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

          const parsedData = results.data.map((row: Record<string, string | undefined>) => {
            const credit = parseAmount(row['Credit'] || row['credit']);
            const debit = parseAmount(row['Debit'] || row['debit']);
            const dollarAmount = parseAmount(row['$'] || row['Amount']);
            
            let amount = dollarAmount;
            if (amount === null) {
              if (credit != null) {
                amount = Math.abs(credit);
              } else if (debit != null) {
                amount = -Math.abs(debit);
              } else {
                amount = 0;
              }
            }

            const transactionDate = parseCSVDate(row['Date'] || row['date']);
            const workValue = (row['Work'] || row['work'] || '').toLowerCase().trim();
            let isWork = workValue === 'yes' || workValue === 'true' || workValue === '1';

            const description = (row['Description'] || row['description'] || '').trim();
            const rawCategory1 = (row['Category 1'] || row['Category 1'] || row['category_1'] || '').trim();
            const rawCategory2 = (row['Category 2'] || row['Category 2'] || row['category_2'] || '').trim();
            let notes = (row['Notes'] || row['notes'] || '').trim();

            // Normalise known Category 2 variants (Coffee/Groceries -> Food, blank Myki -> Transport)
            const normalised = normalizeCategory2(rawCategory1, rawCategory2);
            const finalCategory2 = normalised.category_2;

            let autoWork = false;
            let autoNotes = false;

            // Auto-switch Study immersion rows to work Yes + append notes
            if (isImmersionTransaction(rawCategory1, transactionDate)) {
              if (!isWork) {
                isWork = true;
                autoWork = true;
              }
              const receipt = extractReceipt(description);
              const { place, descDate } = extractPlaceAndDate(description);
              const bits: string[] = [];
              if (place || descDate) bits.push([place, descDate].filter(Boolean).join(' '));
              if (normalised.noteHint) bits.push(normalised.noteHint);
              if (receipt) bits.push(`Receipt ${receipt}`);
              bits.push(IMMERSION_TAG);
              const autoSuffix = bits.filter(Boolean).join(' - ');
              if (!notes) {
                notes = autoSuffix;
                autoNotes = true;
              } else if (!notes.toLowerCase().includes('fnh') && !notes.toLowerCase().includes('immersion')) {
                notes = `${notes} | ${autoSuffix}`;
                autoNotes = true;
              }
            } else if (rawCategory1.trim().toLowerCase() === 'myki' && transactionDate >= IMMERSION_START && transactionDate <= IMMERSION_END) {
              // Airport transit around the immersion window
              if (!isWork) {
                isWork = true;
                autoWork = true;
              }
              if (!notes) {
                const receipt = extractReceipt(description);
                notes = receipt ? `Airport transit - Receipt ${receipt} - ${IMMERSION_TAG}` : `Airport transit - ${IMMERSION_TAG}`;
                autoNotes = true;
              }
            }

            return {
              transaction_date: transactionDate,
              description: description,
              credit: credit,
              debit: debit,
              amount: amount,
              account_identifier: (row['Account'] || row['account'] || '').trim(),
              account_label: (row['Account_1'] || row['Account 1'] || row['Account'] || row['account'] || '').trim(),
              category_1: rawCategory1,
              category_2: finalCategory2,
              is_work: isWork,
              notes: notes,
              week: parseInt(row['Week'] || row['week']) || 0,
              month_code: row['MONTH'] || row['month'] || '',
              month_name: row['MONTH (2)'] || '',
              mmm_yyyy: row['mmm-yyyy'] || row['mmm_yyyy'] || '',
              _isDuplicate: false,
              _autoWork: autoWork,
              _autoNotes: autoNotes
            };
          }).filter(t => t.transaction_date && t.description);

          // Detect unmapped categories. 'Account' is reserved for internal
          // transfers (excluded from all analytics), so it never needs a group.
          const incomingCategories = new Set<string>(parsedData.map(t => t.category_1).filter(Boolean));
          const unmapped = Array.from(incomingCategories)
            .filter(cat => cat !== 'Account')
            .filter(cat => !mappedCategoryNames.has(cat));
          setUnmappedCategories(unmapped);

          // Mark duplicates — checks against both already-imported transactions and
          // earlier rows in this same file, so an accidental double-export (two
          // identical rows in one CSV) is also caught, not just re-imports of an
          // already-saved transaction.
          parsedData.forEach(t => {
            const sig = generateSignature(t);
            t._isDuplicate = existingSignatures.has(sig);
            existingSignatures.add(sig);
          });

          setProgress(80);
          setParsedData(parsedData);
          setPreview(parsedData.slice(0, 5));
          setProgress(100);
          setImporting(false);
        } catch (error: unknown) {
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
                <span className="text-profit">
                  {parsedData.filter(t => !t._isDuplicate).length} new
                </span>
                <span className="text-warning">
                  {parsedData.filter(t => t._isDuplicate).length} duplicates
                </span>
              </div>
            </div>

            {unmappedCategories.length > 0 && (
              <div className="p-3 rounded-xl bg-warning-bg border border-warning-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-bg text-warning">
                  <Tags className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-warning">New Categories Detected</p>
                  <p className="text-[10px] text-warning/80">You'll be asked to map {unmappedCategories.length} new categories in the next step.</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs">Work</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs w-20">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((t, i) => (
                    <TableRow key={i} className={cn(t._isDuplicate && "opacity-50 bg-warning-bg/50")}>
                      <TableCell className="text-sm">{t.transaction_date}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate text-muted-foreground">
                        {t.notes || '—'}
                        {t._autoNotes && <span className="ml-1 text-[10px] text-ai font-bold">auto</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {t.is_work ? (
                          <span className="font-bold text-profit">Yes{t._autoWork ? ' • auto' : ''}</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                      <TableCell>
                        {t._isDuplicate ? (
                          <Badge variant="outline" className="text-[10px] bg-warning-bg text-warning border-warning-border">
                            Skip
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-profit-bg text-profit border-profit-border">
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
              <AlertTriangle className="w-10 h-10 mx-auto text-warning" />
            ) : (
              <CheckCircle2 className="w-10 h-10 mx-auto text-profit" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-lg">Import Complete</p>
            </div>
            <div className="flex justify-center gap-6 text-sm">
              <span className="text-profit">{result.imported} imported</span>
              {result.duplicates > 0 && (
                <span className="text-warning">{result.duplicates} skipped</span>
              )}
              {result.errors > 0 && (
                <span className="text-danger">{result.errors} errors</span>
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