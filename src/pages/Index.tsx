"use client";

import React, { useState, useEffect, useMemo } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceTable from '@/components/FinanceTable';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import ExportButton from '@/components/ExportButton';
import QuickStats from '@/components/QuickStats';
import DateRangeFilter from '@/components/DateRangeFilter';
import MonthlySummary from '@/components/MonthlySummary';
import SortControl, { SortField, SortOrder } from '@/components/SortControl';
import ThemeToggle from '@/components/ThemeToggle';
import { SummarySkeleton, FormSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank, LogOut, Loader2, ListFilter, CreditCard, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface TransactionSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    transaction_date: string;
    category_1: string;
  }>;
}

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchEntries();
      fetchTransactionSummary();
    }
  }, [session, authLoading, navigate]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('finance_entries')
          .select('*')
          .order('date', { ascending: false })
          .order('id', { ascending: false }) // Deterministic sort
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }
      
      const mappedData = allData.map(item => ({
        id: item.id,
        date: item.date,
        creditWas: item.credit_was,
        amount: item.amount,
        account: item.account,
        monthYear: item.month_year
      }));
      
      setEntries(mappedData);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionSummary = async () => {
    if (!session) return;
    setLoadingTransactions(true);
    try {
      let allTransactions: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      // Fetch all transactions to get accurate totals for the summary card
      while (hasMore) {
        const { data, error } = await supabase
          .from('finance_transactions')
          .select('id, description, amount, transaction_date, category_1')
          .order('transaction_date', { ascending: false })
          .order('id', { ascending: false }) // Deterministic sort
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allTransactions = [...allTransactions, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }

      const totalIncome = allTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const totalExpenses = allTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

      setTransactionSummary({
        totalTransactions: allTransactions.length,
        totalIncome,
        totalExpenses,
        net: totalIncome - totalExpenses,
        recentTransactions: allTransactions.slice(0, 5)
      });
    } catch (error: any) {
      // Silently fail for transaction summary
    } finally {
      setLoadingTransactions(false);
    }
  };

  const addEntry = async (entry: FinanceEntry) => {
    if (!session) return;
    try {
      const { error } = await supabase
        .from('finance_entries')
        .insert([{
          date: entry.date,
          credit_was: entry.creditWas,
          amount: entry.amount,
          account: entry.account,
          month_year: entry.monthYear,
          user_id: session.user.id
        }]);

      if (error) throw error;
      fetchEntries();
      showSuccess('Entry added successfully!');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const updateEntry = async (id: string, updates: { amount: number; creditWas?: number }) => {
    try {
      const { error } = await supabase
        .from('finance_entries')
        .update({
          amount: updates.amount,
          credit_was: updates.creditWas
        })
        .eq('id', id);

      if (error) throw error;
      fetchEntries();
      showSuccess('Entry updated successfully!');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
      showSuccess('Entry deleted successfully!');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const calculatedEntries: CalculatedEntry[] = useMemo(() => {
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((entry, index, allEntries) => {
        const previousEntry = allEntries.slice(index + 1).find(e => e.account === entry.account);
        
        let difference = 0;
        if (previousEntry) {
          difference = entry.amount - previousEntry.amount;
        } else if (entry.account === 'Credit' && entry.creditWas !== undefined) {
          difference = entry.amount - entry.creditWas;
        }

        return { ...entry, difference };
      });
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return calculatedEntries;
    
    return calculatedEntries.filter(entry => {
      const entryDate = parseISO(entry.date);
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
      }
      if (dateRange.from) return entryDate >= dateRange.from;
      if (dateRange.to) return entryDate <= dateRange.to;
      return true;
    });
  }, [calculatedEntries, dateRange]);

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'account':
          comparison = a.account.localeCompare(b.account);
          break;
        case 'difference':
          comparison = a.difference - b.difference;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEntries, sortField, sortOrder]);

  const lastEntry = entries[0];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary to-purple-600 rounded-2xl text-white shadow-lg shadow-primary/25">
                <PiggyBank className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Weekly Finance Log
              </span>
            </h1>
            <p className="text-sm text-muted-foreground pl-[52px]">
              {session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild className="rounded-xl gap-2">
              <Link to="/transactions">
                <ListFilter className="w-4 h-4" />
                <span className="hidden sm:inline">Detailed History</span>
              </Link>
            </Button>
            <ExportButton entries={sortedEntries} />
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSignOut} 
              className="rounded-xl gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </header>

        {loading ? (
          <>
            <SummarySkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormSkeleton />
              <Card className="bg-card/80 backdrop-blur-sm border shadow-xl">
                <CardHeader>
                  <Skeleton className="h-6 w-36 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full rounded-xl" />
                </CardContent>
              </Card>
            </div>
            <TableSkeleton />
          </>
        ) : (
          <>
            <FinanceSummary entries={calculatedEntries} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FinanceForm onAddEntry={addEntry} lastEntry={lastEntry} />
              <FinanceChart entries={calculatedEntries} />
            </div>

            <MonthlySummary entries={calculatedEntries} />

            {/* Transaction Summary Card */}
            {transactionSummary && transactionSummary.totalTransactions > 0 && (
              <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/20 animate-slide-up opacity-0 stagger-3">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <CreditCard className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Transaction Overview</h3>
                        <p className="text-xs text-muted-foreground">From your imported bank transactions</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="rounded-xl">
                      <Link to="/transactions">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Income</span>
                      </div>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(transactionSummary.totalIncome)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                        <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">Expenses</span>
                      </div>
                      <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
                        {formatCurrency(-transactionSummary.totalExpenses)}
                      </p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl",
                      transactionSummary.net >= 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-amber-50 dark:bg-amber-950"
                    )}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className={cn(
                          "w-3.5 h-3.5",
                          transactionSummary.net >= 0 ? "text-blue-600" : "text-amber-600"
                        )} />
                        <span className={cn(
                          "text-xs font-medium",
                          transactionSummary.net >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"
                        )}>Net</span>
                      </div>
                      <p className={cn(
                        "text-lg font-bold",
                        transactionSummary.net >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"
                      )}>
                        {formatCurrency(transactionSummary.net)}
                      </p>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Transactions</p>
                    {transactionSummary.recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            t.amount > 0 ? "bg-emerald-500" : "bg-rose-500"
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{t.description}</p>
                            <p className="text-xs text-muted-foreground">{t.category_1}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-sm font-bold tabular-nums shrink-0",
                          t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4 animate-slide-up opacity-0 stagger-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight">History</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <QuickStats entries={filteredEntries} />
                  <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                  <SortControl 
                    sortField={sortField} 
                    sortOrder={sortOrder} 
                    onSortChange={(field, order) => {
                      setSortField(field);
                      setSortOrder(order);
                    }} 
                  />
                </div>
              </div>
              <FinanceTable 
                entries={sortedEntries} 
                onDeleteEntry={deleteEntry}
                onUpdateEntry={updateEntry}
              />
            </div>
          </>
        )}

        <footer className="pt-8 pb-4">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Index;