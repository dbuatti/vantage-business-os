"use client";

import React, { useState, useEffect, useMemo } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import MonthlySummary from '@/components/MonthlySummary';
import { SummarySkeleton, FormSkeleton } from '@/components/LoadingSkeleton';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank, CreditCard, ArrowUpRight, ArrowDownRight, TrendingUp, ListFilter, Calculator, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  const { session } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchEntries();
      fetchTransactionSummary();
    }
  }, [session]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const mappedData = (data || []).map(item => ({
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
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('id, description, amount, transaction_date, category_1')
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      
      const totalIncome = (data || []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const totalExpenses = (data || []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

      setTransactionSummary({
        totalTransactions: data?.length || 0,
        totalIncome,
        totalExpenses,
        net: totalIncome - totalExpenses,
        recentTransactions: (data || []).slice(0, 5)
      });
    } catch (error: any) {
      // Silently fail
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="space-y-1 animate-fade-in">
        <h1 className="text-3xl font-black tracking-tight">Financial Overview</h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening with your money.</p>
      </header>

      {loading ? (
        <div className="space-y-8">
          <SummarySkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FormSkeleton />
            <Card className="h-64 animate-pulse bg-muted/20" />
          </div>
        </div>
      ) : (
        <>
          <FinanceSummary entries={calculatedEntries} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <FinanceChart entries={calculatedEntries} />
              <MonthlySummary entries={calculatedEntries} />
            </div>
            <div className="space-y-6">
              <FinanceForm onAddEntry={addEntry} lastEntry={entries[0]} />
              
              {/* Quick Actions Widget */}
              <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 to-background">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-2">
                  <Button variant="outline" asChild className="justify-start h-12 rounded-xl gap-3">
                    <Link to="/transactions">
                      <ListFilter className="w-4 h-4 text-primary" />
                      Detailed History
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="justify-start h-12 rounded-xl gap-3">
                    <Link to="/accountant-report">
                      <Calculator className="w-4 h-4 text-emerald-500" />
                      Tax Report
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="justify-start h-12 rounded-xl gap-3">
                    <Link to="/transactions?tab=planning">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Financial Planning
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Transaction Summary Card */}
          {transactionSummary && transactionSummary.totalTransactions > 0 && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-muted/20 animate-slide-up">
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
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">Income</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                      {formatCurrency(transactionSummary.totalIncome)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowDownRight className="w-4 h-4 text-rose-600" />
                      <span className="text-xs text-rose-700 dark:text-rose-300 font-bold uppercase tracking-wider">Expenses</span>
                    </div>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-300">
                      {formatCurrency(-transactionSummary.totalExpenses)}
                    </p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl border",
                    transactionSummary.net >= 0 
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50" 
                      : "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50"
                  )}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className={cn(
                        "w-4 h-4",
                        transactionSummary.net >= 0 ? "text-blue-600" : "text-amber-600"
                      )} />
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-wider",
                        transactionSummary.net >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"
                      )}>Net</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-black",
                      transactionSummary.net >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {formatCurrency(transactionSummary.net)}
                    </p>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {transactionSummary.recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-background/50 border hover:bg-background transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            t.amount > 0 ? "bg-emerald-500" : "bg-rose-500"
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{t.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium">{t.category_1}</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-sm font-black tabular-nums shrink-0",
                          t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <footer className="pt-8 pb-4">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;