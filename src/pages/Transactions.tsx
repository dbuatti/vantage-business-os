"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  FileText, 
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BarChart3
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import TransactionImporter from '@/components/TransactionImporter';
import TransactionCharts from '@/components/TransactionCharts';
import TransactionFiltersComponent, { TransactionFilters } from '@/components/TransactionFilters';

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

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

const Transactions = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    category: 'All',
    type: 'all',
    work: 'all',
    dateRange: { from: undefined, to: undefined },
    minAmount: '',
    maxAmount: ''
  });
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

  const handleImport = async (parsedData: any[]) => {
    if (!session) return { total: 0, imported: 0, duplicates: 0, errors: 1 };

    // Get existing transaction signatures for duplicate detection
    const existingSignatures = new Set(
      transactions.map(t => 
        `${t.transaction_date}-${t.description}-${t.amount}`
      )
    );

    let duplicates = 0;
    const newData = parsedData.filter(row => {
      const signature = `${row.transaction_date}-${row.description}-${row.amount}`;
      if (existingSignatures.has(signature)) {
        duplicates++;
        return false;
      }
      existingSignatures.add(signature);
      return true;
    });

    if (newData.length === 0) {
      return {
        total: parsedData.length,
        imported: 0,
        duplicates,
        errors: 0
      };
    }

    try {
      const dataWithUserId = newData.map(row => ({
        ...row,
        user_id: session.user.id
      }));

      const { error } = await supabase
        .from('finance_transactions')
        .insert(dataWithUserId);

      if (error) throw error;

      await fetchTransactions();

      return {
        total: parsedData.length,
        imported: newData.length,
        duplicates,
        errors: 0
      };
    } catch (error: any) {
      return {
        total: parsedData.length,
        imported: 0,
        duplicates,
        errors: 1
      };
    }
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

    const headers = ['Date', 'Description', 'Category', 'Subcategory', 'Account', 'Amount', 'Work', 'Notes'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      t.description,
      t.category_1,
      t.category_2,
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        !filters.search ||
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.category_1?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.account_label?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.notes?.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesCategory = filters.category === 'All' || t.category_1 === filters.category;
      
      const matchesType = 
        filters.type === 'all' ||
        (filters.type === 'income' && t.amount > 0) ||
        (filters.type === 'expense' && t.amount < 0);
      
      const matchesWork =
        filters.work === 'all' ||
        (filters.work === 'work' && t.is_work) ||
        (filters.work === 'personal' && !t.is_work);

      const matchesDateRange = 
        (!filters.dateRange.from || new Date(t.transaction_date) >= filters.dateRange.from) &&
        (!filters.dateRange.to || new Date(t.transaction_date) <= filters.dateRange.to);

      const matchesMinAmount = !filters.minAmount || Math.abs(t.amount) >= parseFloat(filters.minAmount);
      const matchesMaxAmount = !filters.maxAmount || Math.abs(t.amount) <= parseFloat(filters.maxAmount);

      return matchesSearch && matchesCategory && matchesType && matchesWork && matchesDateRange && matchesMinAmount && matchesMaxAmount;
    }).sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = a.category_1.localeCompare(b.category_1);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, filters, sortField, sortOrder]);

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

    const workIncome = filteredTransactions
      .filter(t => t.is_work && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const workExpenses = filteredTransactions
      .filter(t => t.is_work && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      income,
      expenses,
      net: income - expenses,
      workIncome,
      workExpenses,
      workNet: workIncome - workExpenses,
      totalCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: val !== 0 ? 'always' : 'auto'
    }).format(val);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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
              <p className="text-sm text-muted-foreground">
                {transactions.length > 0 
                  ? `${transactions.length} transactions imported`
                  : 'Import your bank transactions to get started'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV} 
              className="rounded-xl gap-2" 
              disabled={filteredTransactions.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            {transactions.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={deleteAllTransactions} 
                className="rounded-xl gap-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear All</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {transactions.length > 0 && (
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
                {summaryStats.workIncome > 0 && (
                  <p className="text-xs text-white/70 mt-2">
                    {formatCurrency(summaryStats.workIncome)} from work
                  </p>
                )}
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
                {summaryStats.workExpenses > 0 && (
                  <p className="text-xs text-white/70 mt-2">
                    {formatCurrency(-summaryStats.workExpenses)} work expenses
                  </p>
                )}
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
                <p className="text-xs text-white/70 mt-2">
                  Work net: {formatCurrency(summaryStats.workNet)}
                </p>
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
                <p className="text-xs text-white/70 mt-2">
                  {transactions.filter(t => t.is_work).length} work-related
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import Section */}
        <TransactionImporter 
          onImport={handleImport}
          existingDates={transactions.map(t => t.transaction_date)}
        />

        {/* Main Content */}
        {transactions.length > 0 && (
          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList className="rounded-xl">
              <TabsTrigger value="transactions" className="rounded-lg gap-2">
                <FileText className="w-4 h-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              {/* Filters */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <TransactionFiltersComponent
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={categories}
                    totalCount={transactions.length}
                    filteredCount={filteredTransactions.length}
                  />
                </CardContent>
              </Card>

              {/* Transactions Table */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead 
                          className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-1">
                            Date
                            {sortField === 'date' && (
                              <ArrowUpDown className="w-3 h-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('description')}
                        >
                          <div className="flex items-center gap-1">
                            Description
                            {sortField === 'description' && (
                              <ArrowUpDown className="w-3 h-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center gap-1">
                            Category
                            {sortField === 'category' && (
                              <ArrowUpDown className="w-3 h-3" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase">Account</TableHead>
                        <TableHead 
                          className="font-semibold text-xs uppercase text-right cursor-pointer hover:bg-muted/80"
                          onClick={() => handleSort('amount')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Amount
                            {sortField === 'amount' && (
                              <ArrowUpDown className="w-3 h-3" />
                            )}
                          </div>
                        </TableHead>
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
                              <p className="text-sm">Try adjusting your filters</p>
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
                              <div className="flex flex-wrap items-center gap-1">
                                <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-primary/5 text-primary border-primary/10">
                                  {t.category_1 || 'Uncategorized'}
                                </Badge>
                                {t.category_2 && (
                                  <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-muted">
                                    {t.category_2}
                                  </Badge>
                                )}
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
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
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
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 rounded-lg"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
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

            <TabsContent value="analytics" className="space-y-4">
              <TransactionCharts transactions={filteredTransactions} />
            </TabsContent>
          </Tabs>
        )}

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