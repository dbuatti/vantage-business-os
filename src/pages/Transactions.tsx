"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search,
  Filter,
  Trash2,
  Download
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import Papa from 'papaparse';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import SearchBar from '@/components/SearchBar';

interface Transaction {
  id?: string;
  week: number;
  month_code: string;
  month_name: string;
  transaction_date: string;
  account_identifier: string;
  description: string;
  credit: number | null;
  debit: number | null;
  account_label: string;
  category_1: string;
  category_2: string;
  is_work: boolean;
  amount: number;
  notes: string;
  mmm_yyyy: string;
}

const Transactions = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchTransactions();
    }
  }, [session, authLoading, navigate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedData = results.data.map((row: any) => {
            // Handle the specific CSV format provided
            const credit = parseFloat(row['Credit']?.replace(/[$,]/g, '')) || null;
            const debit = parseFloat(row['Debit']?.replace(/[$,]/g, '')) || null;
            const amount = parseFloat(row['$']?.replace(/[$,]/g, '')) || (credit || 0) + (debit || 0);
            
            // Parse date from DD/MM/YYYY
            let formattedDate = '';
            try {
              const dateParts = row['Date'].split('/');
              if (dateParts.length === 3) {
                formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
              }
            } catch (e) {
              formattedDate = new Date().toISOString().split('T')[0];
            }

            return {
              user_id: session?.user.id,
              week: parseInt(row['Week']) || 0,
              month_code: row['MONTH'] || '',
              month_name: row['MONTH (2)'] || '',
              transaction_date: formattedDate,
              account_identifier: row['Account'] || '',
              description: row['Description'] || '',
              credit: credit,
              debit: debit,
              account_label: row['Account_1'] || row['Account'] || '', // Handle duplicate header names
              category_1: row['Category 1'] || '',
              category_2: row['Category 2'] || '',
              is_work: row['Work']?.toLowerCase() === 'yes',
              amount: amount,
              notes: row['Notes'] || '',
              mmm_yyyy: row['mmm-yyyy'] || ''
            };
          });

          const { error } = await supabase
            .from('finance_transactions')
            .insert(parsedData);

          if (error) throw error;
          
          showSuccess(`Successfully imported ${parsedData.length} transactions`);
          fetchTransactions();
        } catch (error: any) {
          showError(`Import failed: ${error.message}`);
        } finally {
          setImporting(false);
          // Reset input
          e.target.value = '';
        }
      }
    });
  };

  const deleteAllTransactions = async () => {
    if (!confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('user_id', session?.user.id);

      if (error) throw error;
      setTransactions([]);
      showSuccess('All transactions deleted');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.category_1.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.account_label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || t.category_1 === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, filterCategory]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [transactions]);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Detailed Transactions</h1>
              <p className="text-sm text-muted-foreground">Import and analyze your 2025-2026 history</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                disabled={importing}
              />
              <Button asChild variant="default" className="rounded-xl gap-2 bg-primary shadow-lg shadow-primary/20">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import CSV
                </label>
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={deleteAllTransactions} className="rounded-xl text-rose-500 hover:bg-rose-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 border-0 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold">Search</label>
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search description..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold">Category</label>
                <div className="flex flex-wrap gap-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        filterCategory === cat 
                          ? "bg-primary text-white shadow-md" 
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 border-0 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-bold uppercase">Date</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Description</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Category</TableHead>
                    <TableHead className="text-xs font-bold uppercase">Account</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={5} className="h-12 animate-pulse bg-muted/20" />
                      </TableRow>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-10 h-10 opacity-20" />
                          <p>No transactions found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="whitespace-nowrap text-sm font-medium">
                          {format(new Date(t.transaction_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm" title={t.description}>
                          {t.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg font-medium text-[10px] bg-primary/5 text-primary border-primary/10">
                            {t.category_1}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.account_label}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-bold",
                          t.amount < 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            signDisplay: 'always'
                          }).format(t.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Transactions;