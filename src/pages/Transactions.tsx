"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  FileText, 
  Trash2,
  Pencil,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  BarChart3,
  X,
  Filter,
  ChevronsUpDown,
  CheckSquare,
  CalendarDays,
  Repeat,
  Target,
  Store,
  Flame,
  Layers,
  Activity,
  Tags,
  Calculator
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import TransactionImporter from '@/components/TransactionImporter';
import TransactionCharts from '@/components/TransactionCharts';
import MonthlyComparison from '@/components/MonthlyComparison';
import BudgetTracker from '@/components/BudgetTracker';
import RecurringTransactions from '@/components/RecurringTransactions';
import TransactionBottomBar from '@/components/TransactionBottomBar';
import MerchantAnalysis from '@/components/MerchantAnalysis';
import SpendingHeatmap from '@/components/SpendingHeatmap';
import SavingsGoals from '@/components/SavingsGoals';
import CategoryBreakdown from '@/components/CategoryBreakdown';
import TransactionStats from '@/components/TransactionStats';
import CategoryGroupManager from '@/components/CategoryGroupManager';
import MonthlyGroupReport from '@/components/MonthlyGroupReport';

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

interface CategoryGroup {
  id: string;
  category_name: string;
  group_name: string;
}

type SortField = 'date' | 'amount' | 'description' | 'category';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

const Transactions = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterWork, setFilterWork] = useState<'all' | 'work' | 'personal'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    description: '', amount: '', category_1: '', category_2: '', is_work: false, notes: ''
  });

  const [showBulkDelete, setShowBulkDelete] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchTransactions();
      fetchCategoryGroups();
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

  const fetchCategoryGroups = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('*')
        .order('group_name');
      if (error) throw error;
      setCategoryGroups(data || []);
    } catch (error: any) {
      // Table might not exist yet
    }
  };

  const handleImport = async (parsedData: any[]) => {
    if (!session) return { total: 0, imported: 0, duplicates: 0, errors: 1 };
    try {
      // Strip internal _isDuplicate property before sending to Supabase
      const dataToInsert = parsedData.map(({ _isDuplicate, ...rest }) => ({
        ...rest,
        user_id: session.user.id
      }));

      const { error } = await supabase.from('finance_transactions').insert(dataToInsert);
      if (error) throw error;
      await fetchTransactions();
      return { total: parsedData.length, imported: parsedData.length, duplicates: 0, errors: 0 };
    } catch (error: any) {
      console.error("Import error:", error);
      return { total: parsedData.length, imported: 0, duplicates: 0, errors: 1 };
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
      const { error } = await supabase.from('finance_transactions').update({
        description: editForm.description,
        amount: parseFloat(editForm.amount) || 0,
        category_1: editForm.category_1,
        category_2: editForm.category_2,
        is_work: editForm.is_work,
        notes: editForm.notes
      }).eq('id', editingTransaction.id);
      if (error) throw error;
      showSuccess('Transaction updated');
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
      showSuccess('Transaction deleted');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('finance_transactions').delete().in('id', ids);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => !selectedIds.has(t.id!)));
      showSuccess(`${ids.length} transactions deleted`);
      setSelectedIds(new Set());
      setShowBulkDelete(false);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const deleteAllTransactions = async () => {
    if (!confirm('Delete ALL transactions? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('finance_transactions').delete().eq('user_id', session?.user.id);
      if (error) throw error;
      setTransactions([]);
      setSelectedIds(new Set());
      showSuccess('All transactions deleted');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTransactions.map(t => t.id!)));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterType('all');
    setFilterWork('all');
    setDateRange({ from: undefined, to: undefined });
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterCategory !== 'All' || filterType !== 'all' || filterWork !== 'all' || dateRange.from || dateRange.to || minAmount || maxAmount;

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !searchQuery ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category_1?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.account_label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || t.category_1 === filterCategory;
      const matchesType = filterType === 'all' || (filterType === 'income' && t.amount > 0) || (filterType === 'expense' && t.amount < 0);
      const matchesWork = filterWork === 'all' || (filterWork === 'work' && t.is_work) || (filterWork === 'personal' && !t.is_work);
      const matchesDateRange = (!dateRange.from || new Date(t.transaction_date) >= dateRange.from) && (!dateRange.to || new Date(t.transaction_date) <= dateRange.to);
      const matchesMinAmount = !minAmount || Math.abs(t.amount) >= parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || Math.abs(t.amount) <= parseFloat(maxAmount);
      return matchesSearch && matchesCategory && matchesType && matchesWork && matchesDateRange && matchesMinAmount && matchesMaxAmount;
    }).sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date': comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime(); break;
        case 'amount': comparison = Math.abs(a.amount) - Math.abs(b.amount); break;
        case 'description': comparison = a.description.localeCompare(b.description); break;
        case 'category': comparison = a.category_1.localeCompare(b.category_1); break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, searchQuery, filterCategory, filterType, filterWork, dateRange, minAmount, maxAmount, sortField, sortOrder]);

  // Analytics transactions exclude 'Account' category (internal transfers)
  const analyticsTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.category_1 !== 'Account');
  }, [filteredTransactions]);

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
    const income = analyticsTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = analyticsTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const workIncome = analyticsTransactions.filter(t => t.is_work && t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const workExpenses = analyticsTransactions.filter(t => t.is_work && t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return { income, expenses, net: income - expenses, workIncome, workExpenses, workNet: workIncome - workExpenses, totalCount: analyticsTransactions.length };
  }, [analyticsTransactions]);

  const selectedStats = useMemo(() => {
    const selected = filteredTransactions.filter(t => selectedIds.has(t.id!));
    const total = selected.reduce((sum, t) => sum + t.amount, 0);
    return { count: selected.length, total };
  }, [filteredTransactions, selectedIds]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: val !== 0 ? 'always' : 'auto' }).format(val);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Subcategory', 'Account', 'Amount', 'Work', 'Notes'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'), t.description, t.category_1, t.category_2,
      t.account_label, t.amount.toString(), t.is_work ? 'Yes' : 'No', t.notes || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    showSuccess(`Exported ${filteredTransactions.length} transactions`);
  };

  const datePresets = [
    { label: 'Last 7 days', range: { from: subDays(new Date(), 7), to: new Date() } },
    { label: 'Last 30 days', range: { from: subDays(new Date(), 30), to: new Date() } },
    { label: 'This month', range: { from: startOfMonth(new Date()), to: new Date() } },
    { label: 'Last month', range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: 'Last 3 months', range: { from: subMonths(new Date(), 3), to: new Date() } },
    { label: 'Last 6 months', range: { from: subMonths(new Date(), 6), to: new Date() } },
    { label: 'This year', range: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() } },
  ];

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [searchQuery, filterCategory, filterType, filterWork, dateRange, minAmount, maxAmount]);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Transaction History</h1>
              <p className="text-sm text-muted-foreground">
                {transactions.length > 0 ? `${transactions.length} transactions imported` : 'Import your bank transactions to get started'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="rounded-xl gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
              <Link to="/accountant-report">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Accountant Ready</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-xl gap-2" disabled={filteredTransactions.length === 0}>
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
            </Button>
            {transactions.length > 0 && (
              <Button variant="outline" size="sm" onClick={deleteAllTransactions} className="rounded-xl gap-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Clear All</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards - uses analyticsTransactions (excludes Account) */}
        {analyticsTransactions.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1">
            <Card className="border-0 shadow-lg bg-emerald-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-white/80">Income</p><p className="text-2xl font-bold">{formatCurrency(summaryStats.income)}</p></div>
                  <div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                </div>
                {summaryStats.workIncome > 0 && <p className="text-xs text-white/70 mt-2">{formatCurrency(summaryStats.workIncome)} from work</p>}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-rose-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-white/80">Expenses</p><p className="text-2xl font-bold">{formatCurrency(-summaryStats.expenses)}</p></div>
                  <div className="p-2 bg-white/20 rounded-xl"><TrendingDown className="w-5 h-5" /></div>
                </div>
                {summaryStats.workExpenses > 0 && <p className="text-xs text-white/70 mt-2">{formatCurrency(-summaryStats.workExpenses)} work expenses</p>}
              </CardContent>
            </Card>
            <Card className={cn("border-0 shadow-lg text-white overflow-hidden relative", summaryStats.net >= 0 ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-amber-500 to-amber-600")}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-white/80">Net</p><p className="text-2xl font-bold">{formatCurrency(summaryStats.net)}</p></div>
                  <div className="p-2 bg-white/20 rounded-xl"><DollarSign className="w-5 h-5" /></div>
                </div>
                <p className="text-xs text-white/70 mt-2">Work net: {formatCurrency(summaryStats.workNet)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-white/80">Transactions</p><p className="text-2xl font-bold">{summaryStats.totalCount}</p></div>
                  <div className="p-2 bg-white/20 rounded-xl"><FileText className="w-5 h-5" /></div>
                </div>
                <p className="text-xs text-white/70 mt-2">{analyticsTransactions.filter(t => t.is_work).length} work-related</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Import */}
        <TransactionImporter onImport={handleImport} existingTransactions={transactions} />

        {/* Main Content */}
        {transactions.length > 0 && (
          <Tabs defaultValue="transactions" className="space-y-4">
            <TabsList className="rounded-xl flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="transactions" className="rounded-lg gap-2"><FileText className="w-4 h-4" />Transactions</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg gap-2"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
              <TabsTrigger value="groups" className="rounded-lg gap-2"><Tags className="w-4 h-4" />Groups</TabsTrigger>
              <TabsTrigger value="reports" className="rounded-lg gap-2"><CalendarDays className="w-4 h-4" />Reports</TabsTrigger>
              <TabsTrigger value="categories" className="rounded-lg gap-2"><Layers className="w-4 h-4" />Categories</TabsTrigger>
              <TabsTrigger value="stats" className="rounded-lg gap-2"><Activity className="w-4 h-4" />Stats</TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-lg gap-2"><CalendarDays className="w-4 h-4" />Monthly</TabsTrigger>
              <TabsTrigger value="merchants" className="rounded-lg gap-2"><Store className="w-4 h-4" />Merchants</TabsTrigger>
              <TabsTrigger value="recurring" className="rounded-lg gap-2"><Repeat className="w-4 h-4" />Recurring</TabsTrigger>
              <TabsTrigger value="budgets" className="rounded-lg gap-2"><Target className="w-4 h-4" />Budgets</TabsTrigger>
              <TabsTrigger value="goals" className="rounded-lg gap-2"><Flame className="w-4 h-4" />Goals</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
              {/* Search & Filter Bar */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 space-y-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search description, category, notes..."
                        className="pl-10 rounded-xl"
                      />
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>{categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                        <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterWork} onValueChange={(v) => setFilterWork(v as any)}>
                        <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="Work" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="work">Work Only</SelectItem>
                          <SelectItem value="personal">Personal Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={cn("rounded-xl", showFilters && "bg-primary/5")}>
                        <ChevronsUpDown className="w-4 h-4 mr-1" />More
                      </Button>
                      {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
                          <X className="w-4 h-4 mr-1" />Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  {showFilters && (
                    <div className="flex flex-wrap items-end gap-4 pt-2 border-t animate-fade-in">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Date Range</Label>
                        <div className="flex flex-wrap gap-1">
                          {datePresets.map(({ label, range }) => (
                            <Button
                              key={label}
                              variant="ghost"
                              size="sm"
                              className={cn("h-7 text-xs rounded-lg", dateRange.from?.getTime() === range.from.getTime() && "bg-primary/10 text-primary")}
                              onClick={() => setDateRange(range)}
                            >
                              {label}
                            </Button>
                          ))}
                          {dateRange.from && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg text-muted-foreground" onClick={() => setDateRange({ from: undefined, to: undefined })}>
                              <X className="w-3 h-3 mr-1" />Clear
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Amount:</Label>
                        <Input type="number" placeholder="Min" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-24 h-8 rounded-lg text-sm" />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input type="number" placeholder="Max" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-24 h-8 rounded-lg text-sm" />
                      </div>
                    </div>
                  )}

                  {hasActiveFilters && (
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{filteredTransactions.length}</span> of {transactions.length} transactions
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Bulk Actions Bar */}
              {selectedIds.size > 0 && (
                <Card className="border-0 shadow-lg bg-primary/5 border-primary/20 animate-fade-in">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{selectedIds.size} selected</span>
                      <span className="text-sm text-muted-foreground">
                        Total: <span className="font-medium text-foreground">{formatCurrency(selectedStats.total)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="rounded-xl">
                        <X className="w-4 h-4 mr-1" />Deselect
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowBulkDelete(true)} className="rounded-xl text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-4 h-4 mr-1" />Delete Selected
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transactions Table */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={paginatedTransactions.length > 0 && selectedIds.size === paginatedTransactions.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80" onClick={() => handleSort('date')}>
                          <div className="flex items-center gap-1">Date {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}</div>
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80" onClick={() => handleSort('description')}>
                          <div className="flex items-center gap-1">Description {sortField === 'description' && <ArrowUpDown className="w-3 h-3" />}</div>
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>
                          <div className="flex items-center gap-1">Category {sortField === 'category' && <ArrowUpDown className="w-3 h-3" />}</div>
                        </TableHead>
                        <TableHead className="font-semibold text-xs uppercase">Account</TableHead>
                        <TableHead className="font-semibold text-xs uppercase text-right cursor-pointer hover:bg-muted/80" onClick={() => handleSort('amount')}>
                          <div className="flex items-center justify-end gap-1">Amount {sortField === 'amount' && <ArrowUpDown className="w-3 h-3" />}</div>
                        </TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}><TableCell colSpan={7} className="h-14 animate-pulse bg-muted/20" /></TableRow>
                        ))
                      ) : paginatedTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="w-10 h-10 opacity-20" />
                              <p className="font-medium">No transactions found</p>
                              <p className="text-sm">Try adjusting your filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedTransactions.map((t) => (
                          <React.Fragment key={t.id}>
                            <TableRow 
                              className={cn(
                                "hover:bg-muted/30 transition-colors group cursor-pointer",
                                selectedIds.has(t.id!) && "bg-primary/5",
                                expandedId === t.id && "bg-muted/40"
                              )}
                              onClick={() => setExpandedId(expandedId === t.id ? null : t.id!)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedIds.has(t.id!)}
                                  onCheckedChange={() => toggleSelect(t.id!)}
                                />
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm font-medium">
                                {format(new Date(t.transaction_date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="max-w-[250px]">
                                <div className="truncate" title={t.description}>{t.description}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap items-center gap-1">
                                  <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-primary/5 text-primary border-primary/10">
                                    {t.category_1 || 'Uncategorized'}
                                  </Badge>
                                  {t.is_work && (
                                    <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200">Work</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{t.account_label}</TableCell>
                              <TableCell className={cn("text-right font-bold tabular-nums", t.amount > 0 ? "text-emerald-600" : t.amount < 0 ? "text-rose-600" : "")}>
                                {formatCurrency(t.amount)}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(t)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600" onClick={() => handleDelete(t.id!)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {expandedId === t.id && (
                              <TableRow className="bg-muted/20">
                                <TableCell colSpan={7} className="p-4">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-fade-in">
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                                      <p className="font-medium">{format(new Date(t.transaction_date), 'EEEE, MMMM dd, yyyy')}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Account</p>
                                      <p className="font-medium">{t.account_label || '—'}</p>
                                      <p className="text-xs text-muted-foreground">{t.account_identifier}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Category</p>
                                      <p className="font-medium">{t.category_1 || '—'}</p>
                                      {t.category_2 && <p className="text-xs text-muted-foreground">{t.category_2}</p>}
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Amounts</p>
                                      <div className="space-y-0.5">
                                        {t.credit && <p className="text-emerald-600 font-medium">Credit: {formatCurrency(t.credit)}</p>}
                                        {t.debit && <p className="text-rose-600 font-medium">Debit: {formatCurrency(t.debit)}</p>}
                                        <p className="font-bold">Net: {formatCurrency(t.amount)}</p>
                                      </div>
                                    </div>
                                    {t.notes && (
                                      <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                        <p className="text-sm">{t.notes}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1">Week / Month</p>
                                      <p className="font-medium">Week {t.week} · {t.mmm_yyyy || t.month_name}</p>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) pageNum = i + 1;
                          else if (currentPage <= 3) pageNum = i + 1;
                          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                          else pageNum = currentPage - 2 + i;
                          return (
                            <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 rounded-lg">
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* All analytics tabs use analyticsTransactions (excludes Account category) */}
            <TabsContent value="analytics" className="space-y-4">
              <TransactionCharts transactions={analyticsTransactions} />
              <SpendingHeatmap transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <CategoryGroupManager 
                transactions={transactions} 
                onGroupsUpdated={fetchCategoryGroups}
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <MonthlyGroupReport 
                transactions={analyticsTransactions} 
                categoryGroups={categoryGroups}
              />
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <CategoryBreakdown transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <TransactionStats transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="monthly" className="space-y-4">
              <MonthlyComparison transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="merchants" className="space-y-4">
              <MerchantAnalysis transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="recurring" className="space-y-4">
              <RecurringTransactions transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="budgets" className="space-y-4">
              <BudgetTracker transactions={analyticsTransactions} />
            </TabsContent>

            <TabsContent value="goals" className="space-y-4">
              <SavingsGoals transactions={analyticsTransactions} />
            </TabsContent>
          </Tabs>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                📅 {editingTransaction && format(new Date(editingTransaction.transaction_date), 'MMMM dd, yyyy')}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={editForm.description} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))} className="rounded-xl text-lg font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={editForm.category_1} onChange={(e) => setEditForm(prev => ({ ...prev, category_1: e.target.value }))} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Input value={editForm.category_2} onChange={(e) => setEditForm(prev => ({ ...prev, category_2: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="is_work" checked={editForm.is_work} onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_work: !!checked }))} />
                <Label htmlFor="is_work" className="font-normal">Work-related expense</Label>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} className="rounded-xl" placeholder="Optional notes..." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEditingTransaction(null)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSaveEdit} className="rounded-xl">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Dialog */}
        <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Delete Selected Transactions</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowBulkDelete(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleBulkDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700">
                Delete {selectedIds.size} Transaction{selectedIds.size > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bottom Summary Bar */}
      {transactions.length > 0 && (
        <TransactionBottomBar
          totalCount={transactions.length}
          filteredCount={filteredTransactions.length}
          totalIncome={summaryStats.income}
          totalExpenses={summaryStats.expenses}
          net={summaryStats.net}
          selectedCount={selectedStats.count}
          selectedTotal={selectedStats.total}
        />
      )}
    </div>
  );
};

export default Transactions;