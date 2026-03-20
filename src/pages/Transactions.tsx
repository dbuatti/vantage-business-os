"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingDown, 
  DollarSign, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Calculator, 
  Wand2, 
  LayoutGrid, 
  PieChart as PieChartIcon, 
  Calendar as CalendarIcon, 
  Loader2, 
  Plus, 
  FileText, 
  Briefcase, 
  Repeat, 
  ArrowUpRight, 
  Target, 
  Activity 
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/format';
import TransactionImporter from '@/components/TransactionImporter';
import TransactionBottomBar from '@/components/TransactionBottomBar';
import CategoryGroupManager from '@/components/CategoryGroupManager';
import MonthlyGroupReport from '@/components/MonthlyGroupReport';
import WorkWizard from '@/components/WorkWizard';
import ManualTransactionDialog from '@/components/ManualTransactionDialog';
import TransactionTable from '@/components/TransactionTable';
import BulkActionsBar from '@/components/BulkActionsBar';
import TransactionFiltersComponent, { TransactionFilters } from '@/components/TransactionFilters';
import TransactionAnalyticsTab from '@/components/TransactionAnalyticsTab';
import TransactionPlanningTab from '@/components/TransactionPlanningTab';
import { Transaction } from '@/types/finance';

const ITEMS_PER_PAGE = 25;

const Transactions = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<any>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showBulkCategorize, setShowBulkCategorize] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [isSavingYear, setIsSavingYear] = useState(false);

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
    description: '', amount: '', category_1: '', category_2: '', is_work: false, notes: '', invoice_id: ''
  });

  const [showBulkDelete, setShowBulkDelete] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchTransactions();
      fetchCategoryGroups();
      fetchUserSettings();
      fetchInvoices();
    }
  }, [session, authLoading, navigate]);

  const fetchUserSettings = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('selected_transaction_year')
        .eq('owner_user_id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.selected_transaction_year) {
        setSelectedYear(data.selected_transaction_year);
      }
    } catch (error) {
      console.error("Error fetching user settings:", error);
    }
  };

  const handleYearChange = async (year: string) => {
    setSelectedYear(year);
    if (!session) return;

    setIsSavingYear(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          owner_user_id: session.user.id, 
          selected_transaction_year: year,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    } catch (error: any) {
      showError("Failed to save year preference");
    } finally {
      setIsSavingYear(false);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let allData: Transaction[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('finance_transactions')
          .select('*')
          .order('transaction_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
      }
      
      setTransactions(allData);
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
    } catch (error: any) {}
  };

  const fetchInvoices = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, number, client_display_name, total_amount')
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
    }
  };

  const handleImport = async (parsedData: any[]) => {
    if (!session) return { total: 0, imported: 0, duplicates: 0, errors: 1 };
    try {
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
      notes: transaction.notes || '',
      invoice_id: transaction.invoice_id || ''
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
        notes: editForm.notes,
        invoice_id: editForm.invoice_id === 'none' ? null : (editForm.invoice_id || null)
      }).eq('id', editingTransaction.id);
      if (error) throw error;
      showSuccess('Transaction updated');
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleBulkCategorize = async () => {
    if (selectedIds.size === 0 || !bulkCategory) return;
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .update({ category_1: bulkCategory })
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      showSuccess(`Updated ${selectedIds.size} transactions`);
      setSelectedIds(new Set());
      setShowBulkCategorize(false);
      fetchTransactions();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleBulkWorkStatus = async (isWork: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .update({ is_work: isWork })
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      showSuccess(`Updated ${selectedIds.size} transactions to ${isWork ? 'Work' : 'Personal'}`);
      setSelectedIds(new Set());
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

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.transaction_date).getFullYear().toString()));
    return ['All', ...Array.from(years).sort((a, b) => b.localeCompare(a))];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !filters.search ||
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.category_1?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.account_label?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.notes?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category === 'All' || t.category_1 === filters.category;
      const matchesType = filters.type === 'all' || (filters.type === 'income' && t.amount > 0) || (filters.type === 'expense' && t.amount < 0);
      const matchesWork = filters.work === 'all' || (filters.work === 'work' && t.is_work) || (filters.work === 'personal' && !t.is_work);
      const matchesDateRange = (!filters.dateRange.from || new Date(t.transaction_date) >= filters.dateRange.from) && (!filters.dateRange.to || new Date(t.transaction_date) <= filters.dateRange.to);
      const matchesMinAmount = !filters.minAmount || Math.abs(t.amount) >= parseFloat(filters.minAmount);
      const matchesMaxAmount = !filters.maxAmount || Math.abs(t.amount) <= parseFloat(filters.maxAmount);
      const matchesYear = selectedYear === 'All' || new Date(t.transaction_date).getFullYear().toString() === selectedYear;

      return matchesSearch && matchesCategory && matchesType && matchesWork && matchesDateRange && matchesMinAmount && matchesMaxAmount && matchesYear;
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
  }, [transactions, filters, sortField, sortOrder, selectedYear]);

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

  const subcategories = useMemo(() => {
    const subs = new Set(transactions.map(t => t.category_2).filter(Boolean));
    return Array.from(subs).sort();
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

  const handleSort = (field: any) => {
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

  useEffect(() => { setCurrentPage(1); setSelectedIds(new Set()); }, [filters, selectedYear]);

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
              <h1 className="text-3xl font-black tracking-tight">Transaction History</h1>
              <p className="text-sm text-muted-foreground">
                {transactions.length > 0 ? `${transactions.length} transactions imported` : 'Import your bank transactions to get started'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-32 rounded-xl h-9 bg-background border-primary/20 text-primary font-bold">
                  {isSavingYear ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <CalendarIcon className="w-4 h-4 mr-2" />}
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowManualEntry(true)}
              className="rounded-xl gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Entry</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowWizard(true)}
              className="rounded-xl gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Work Wizard</span>
            </Button>
            <Button variant="outline" size="sm" asChild className="rounded-xl gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
              <Link to="/accountant-report">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Accountant Ready</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="rounded-xl gap-2" disabled={filteredTransactions.length === 0}>
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {analyticsTransactions.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium text-white/80">Income</p><p className="text-2xl font-bold">{formatCurrency(summaryStats.income)}</p></div>
                  <div className="p-2 bg-white/20 rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>
                </div>
                {summaryStats.workIncome > 0 && <p className="text-xs text-white/70 mt-2">{formatCurrency(summaryStats.workIncome)} from work</p>}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-rose-500 to-rose-600 text-white overflow-hidden relative">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="rounded-xl flex-wrap h-auto gap-1 p-1 bg-muted/50">
                <TabsTrigger value="transactions" className="rounded-lg gap-2"><LayoutGrid className="w-4 h-4" />Data</TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-lg gap-2"><PieChartIcon className="w-4 h-4" />Analysis</TabsTrigger>
                <TabsTrigger value="planning" className="rounded-lg gap-2"><Target className="w-4 h-4" />Planning</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1 bg-background">
                  {filteredTransactions.length} items
                </Badge>
              </div>
            </div>

            <TabsContent value="transactions" className="space-y-4">
              <Tabs defaultValue="list" className="space-y-4">
                <div className="flex items-center justify-between">
                  <TabsList className="h-9 p-1 bg-muted/30 rounded-lg">
                    <TabsTrigger value="list" className="text-xs rounded-md">List View</TabsTrigger>
                    <TabsTrigger value="groups" className="text-xs rounded-md">Category Groups</TabsTrigger>
                    <TabsTrigger value="reports" className="text-xs rounded-md">Monthly Reports</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="list" className="space-y-4">
                  {/* Search & Filter Bar */}
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

                  {/* Bulk Actions Bar */}
                  <BulkActionsBar 
                    selectedCount={selectedIds.size}
                    totalAmount={selectedStats.total}
                    onMarkWork={handleBulkWorkStatus}
                    onCategorize={() => setShowBulkCategorize(true)}
                    onDelete={() => setShowBulkDelete(true)}
                    onClear={() => setSelectedIds(new Set())}
                  />

                  {/* Transactions Table */}
                  <Card className="border-0 shadow-xl overflow-hidden">
                    <TransactionTable 
                      transactions={paginatedTransactions}
                      loading={loading}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onToggleSelectAll={toggleSelectAll}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      expandedId={expandedId}
                      onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
                      sortField={sortField}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          Showing <span className="font-bold text-foreground">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)}</span> of {filteredTransactions.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl h-8">
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
                                <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 rounded-lg text-xs">
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl h-8">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
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
              </Tabs>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Activity className="w-6 h-6" /></div>
                    <div><h3 className="font-bold">Charts</h3><p className="text-xs text-muted-foreground">Visual trends & breakdowns</p></div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><Activity className="w-6 h-6" /></div>
                    <div><h3 className="font-bold">Stats</h3><p className="text-xs text-muted-foreground">Key financial metrics</p></div>
                  </CardContent>
                </Card>
              </div>

              <TransactionAnalyticsTab 
                transactions={analyticsTransactions} 
                categoryGroups={categoryGroups} 
              />
            </TabsContent>

            <TabsContent value="planning" className="space-y-6">
              <TransactionPlanningTab transactions={analyticsTransactions} />
            </TabsContent>
          </Tabs>
        )}

        {/* Dialogs */}
        <ManualTransactionDialog 
          open={showManualEntry} 
          onOpenChange={setShowManualEntry} 
          onSuccess={fetchTransactions}
          categories={categories}
          subcategories={subcategories}
        />

        <Dialog open={showBulkCategorize} onOpenChange={setShowBulkCategorize}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Categorize</DialogTitle>
              <DialogDescription>Update {selectedIds.size} transactions at once.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Category</Label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Choose category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowBulkCategorize(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleBulkCategorize} className="rounded-xl" disabled={!bulkCategory}>Update All</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-xl">
                📅 {editingTransaction && formatDate(editingTransaction.transaction_date, 'MMMM dd, yyyy')}
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
                  <Select value={editForm.category_1} onValueChange={(v) => setEditForm(prev => ({ ...prev, category_1: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== 'All').map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select value={editForm.category_2} onValueChange={(v) => setEditForm(prev => ({ ...prev, category_2: v }))}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subcategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Link Invoice</Label>
                <Select value={editForm.invoice_id} onValueChange={(v) => setEditForm(prev => ({ ...prev, invoice_id: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select an invoice (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {invoices.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.number} - {inv.client_display_name} ({formatCurrency(inv.total_amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <WorkWizard 
          transactions={transactions} 
          open={showWizard} 
          onOpenChange={setShowWizard}
          onComplete={fetchTransactions}
        />
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