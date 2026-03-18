"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  Loader2, 
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import Papa from 'papaparse';
import { format, parse, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns';
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

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  count: number;
}

const ITEMS_PER_PAGE = 25;

const Transactions = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterWork, setFilterWork] = useState<'all' | 'work' | 'personal'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    category_1: '',
    category_2: '',
    is_work: false,
    notes: ''
  });

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
            const credit = parseFloat(row['Credit']?.replace(/[$,]/g, '')) || null;
            const debit = parseFloat(row['Debit']?.replace(/[$,]/g, '')) || null;
            const amount = parseFloat(row['$']?.replace(/[$,]/g, '')) || (credit || 0) - (debit || 0);
            
            let formattedDate = '';
            try {
              const dateStr = row['Date'];
              if (dateStr) {
                const dateParts = dateStr.split('/');
                if (dateParts.length === 3) {
                  const day = dateParts[0].padStart(2, '0');
                  const month = dateParts[1].padStart(2, '0');
                  const year = dateParts[2];
                  formattedDate = `${year}-${month}-${day}`;
                }
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
              account_label: row['Account_1'] || row['Account'] || '',
              category_1: row['Category 1'] || '',
              category_2: row['Category 2'] || '',
              is_work: row['Work']?.toLowerCase() === 'yes',
              amount: amount,
              notes: row['Notes'] || '',
              mmm_yyyy: row['mmm-yyyy'] || ''
            };
          }).filter(t => t.transaction_date);

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
          e.target.value = '';
        }
      }
    });
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      description: transaction.description,
      amount: Math.abs(transaction.amount).toString(),
      category_1: transaction.category_1,
      category_2: transaction.category_2,
      is_work: transaction.is_work,
      notes: transaction.notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction?.id) return;

    try {
      const { error } = await supabase
        .from('finance_transactions')
        .update({
          description: editForm.description,
          amount: parseFloat(editForm.amount) || 0,
          category_1: editForm.category_1,
          category_2: editForm.category_2,
          is_work: editForm.is_work,
          notes: editForm.notes
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;
      
      showSuccess('Transaction updated');
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;

    try {
      const { error } = await supabase
        .from('finance_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      showSuccess('Transaction deleted');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const deleteAllTransactions = async () => {
    if (!confirm('Delete ALL transactions? This cannot be undone.')) return;
    
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

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date', 'Description', 'Category', 'Account', 'Amount', 'Work', 'Notes'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      t.description,
      t.category_1,
      t.account_label,
      t.amount.toString(),
      t.is_work ? 'Yes' : 'No',
      t.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess(`Exported ${filteredTransactions.length} transactions`);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category_1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.account_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = filterCategory === 'All' || t.category_1 === filterCategory;
      
      const matchesType = 
        filterType === 'all' ||
        (filterType === 'income' && t.amount > 0) ||
        (filterType === 'expense' && t.amount < 0);
      
      const matchesWork =
        filterWork === 'all' ||
        (filterWork === 'work' && t.is_work) ||
        (filterWork === 'personal' && !t.is_work);

      return matchesSearch && matchesCategory && matchesType && matchesWork;
    });
  }, [transactions, searchQuery, filterCategory, filterType, filterWork]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return ['All', ...Array.from(cats)].sort();
  }, [transactions]);

  const summaryStats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const workTotal = filteredTransactions
      .filter(t => t.is_work)
      .reduce((sum, t) => sum + t.amount, 0);

    const categoryBreakdown = filteredTransactions.reduce((acc, t) => {
      const cat = t.category_1 || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
      acc[cat].total += t.amount;
      acc[cat].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return {
      income,
      expenses,
      net: income - expenses,
      workTotal,
      totalCount: filteredTransactions.length,
      categoryBreakdown
    };
  }, [filteredTransactions]);

  const monthlyData = useMemo(() => {
    const months = transactions.reduce((acc, t) => {
      const monthKey = t.mmm_yyyy || format(new Date(t.transaction_date), 'MMM yyyy');
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, income: 0, expenses: 0, net: 0, count: 0 };
      }
      
      if (t.amount > 0) acc[monthKey].income += t.amount;
      else acc[monthKey].expenses += Math.abs(t.amount);
      
      acc[monthKey].net = acc[monthKey].income - acc[monthKey].expenses;
      acc[monthKey].count++;
      
      return acc;
    }, {} as Record<string, MonthlyData>);

    return Object.values(months).sort((a, b) => {
      try {
        const dateA = parse(a.month, 'MMM yyyy', new Date());
        const dateB = parse(b.month, 'MMM yyyy', new Date());
        return dateB.getTime() - dateA.getTime();
      } catch {
        return 0;
      }
    });
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: val !== 0 ? 'always' : 'auto'
    }).format(val);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterType('all');
    setFilterWork('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterCategory !== 'All' || filterType !== 'all' || filterWork !== 'all';

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Transaction History</h1>
              <p className="text-sm text-muted-foreground">Import and analyze your 2025-2026 finances</p>
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
              <Button asChild className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                <label htmlFor="csv-upload" className="cursor-pointer">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Import CSV
                </label>
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={exportToCSV} className="rounded-xl" disabled={filteredTransactions.length === 0}>
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={deleteAllTransactions} className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Income</p>
                  <p className="text-2xl font-bold">{formatCurrency(summaryStats.income)}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500 to-rose-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Expenses</p>
                  <p className="text-2xl font-bold">{formatCurrency(-summaryStats.expenses)}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-0 shadow-lg text-white",
            summaryStats.net >= 0 
              ? "bg-gradient-to-br from-blue-500 to-blue-600" 
              : "bg-gradient-to-br from-amber-500 to-amber-600"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Net</p>
                  <p className="text-2xl font-bold">{formatCurrency(summaryStats.net)}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">Transactions</p>
                  <p className="text-2xl font-bold">{summaryStats.totalCount}</p>
                </div>
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="rounded-xl">
            <TabsTrigger value="transactions" className="rounded-lg">Transactions</TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg">Monthly View</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            {/* Filters */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <SearchBar 
                      value={searchQuery} 
                      onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} 
                      placeholder="Search transactions..." 
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-40 rounded-xl">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterType} onValueChange={(v) => { setFilterType(v as any); setCurrentPage(1); }}>
                      <SelectTrigger className="w-32 rounded-xl">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterWork} onValueChange={(v) => { setFilterWork(v as any); setCurrentPage(1); }}>
                      <SelectTrigger className="w-32 rounded-xl">
                        <SelectValue placeholder="Work" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="work">Work</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
                        <X className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                {hasActiveFilters && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-xs uppercase">Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Description</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Category</TableHead>
                      <TableHead className="font-semibold text-xs uppercase">Account</TableHead>
                      <TableHead className="font-semibold text-xs uppercase text-right">Amount</TableHead>
                      <TableHead className="font-semibold text-xs uppercase w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6} className="h-14 animate-pulse bg-muted/20" />
                        </TableRow>
                      ))
                    ) : paginatedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="w-10 h-10 opacity-20" />
                            <p className="font-medium">No transactions found</p>
                            <p className="text-sm">Import a CSV file to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/30 transition-colors group">
                          <TableCell className="whitespace-nowrap text-sm font-medium">
                            {format(new Date(t.transaction_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={t.description}>
                              {t.description}
                            </div>
                            {t.notes && (
                              <div className="text-xs text-muted-foreground truncate" title={t.notes}>
                                {t.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-primary/5 text-primary border-primary/10">
                                {t.category_1 || 'Uncategorized'}
                              </Badge>
                              {t.is_work && (
                                <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200">
                                  Work
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.account_label}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-bold tabular-nums",
                            t.amount > 0 ? "text-emerald-600" : t.amount < 0 ? "text-rose-600" : ""
                          )}>
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleEdit(t)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => handleDelete(t.id!)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyData.map((month) => (
                <Card key={month.month} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">{month.month}</h3>
                      <Badge variant="outline" className="rounded-lg">
                        {month.count} txns
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                          Income
                        </span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(month.income)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                          Expenses
                        </span>
                        <span className="font-semibold text-rose-600">
                          {formatCurrency(-month.expenses)}
                        </span>
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-sm font-medium">Net</span>
                        <span className={cn(
                          "font-bold text-lg",
                          month.net >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(month.net)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  Spending by Category
                </CardTitle>
                <CardDescription>
                  Breakdown of your transactions by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(summaryStats.categoryBreakdown)
                    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
                    .map(([category, data]) => (
                      <div key={category} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            data.total >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                          )}>
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">{category}</p>
                            <p className="text-xs text-muted-foreground">{data.count} transactions</p>
                          </div>
                        </div>
                        <span className={cn(
                          "font-bold tabular-nums",
                          data.total >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(data.total)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                📅 {editingTransaction && format(new Date(editingTransaction.transaction_date), 'MMMM dd, yyyy')}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl text-lg font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={editForm.category_1}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category_1: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Input
                    value={editForm.category_2}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category_2: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_work"
                  checked={editForm.is_work}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_work: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="is_work" className="font-normal">Work-related expense</Label>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl"
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingTransaction(null)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="rounded-xl">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Transactions;