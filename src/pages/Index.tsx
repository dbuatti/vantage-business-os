"use client";

import React, { useState, useEffect, useMemo } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import MonthlySummary from '@/components/MonthlySummary';
import CashFlowForecast from '@/components/CashFlowForecast';
import AnimatedNumber from '@/components/AnimatedNumber';
import { SummarySkeleton, FormSkeleton } from '@/components/LoadingSkeleton';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank, CreditCard, ArrowUpRight, ArrowDownRight, TrendingUp, ListFilter, Calculator, Sparkles, Users, FileText, Briefcase, Brain, ShieldCheck, CheckCircle2, AlertCircle, Zap, Clock, Sun, Moon, Coffee, Info, CalendarRange } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TransactionSummary {
  totalTransactions: number;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  recentTransactions: any[];
  allTransactions: any[];
}

interface BusinessStats {
  totalClients: number;
  outstandingAmount: number;
  recentInvoices: any[];
  taxReadiness: number;
  burnRate: number;
  runway: number;
}

const Index = () => {
  const { session } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchEntries();
      fetchTransactionSummary();
      fetchBusinessStats();
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
        recentTransactions: (data || []).slice(0, 5),
        allTransactions: data || []
      });
    } catch (error: any) {}
  };

  const fetchBusinessStats = async () => {
    try {
      const { data: clients } = await supabase.from('clients').select('total_receivable');
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false })
        .limit(3);
      
      const { data: txns } = await supabase.from('finance_transactions').select('is_work, notes, category_1, amount, transaction_date');
      
      const workTxns = txns?.filter(t => t.is_work) || [];
      const withNotes = workTxns.filter(t => t.notes).length;
      const withCategory = workTxns.filter(t => t.category_1).length;
      const readiness = workTxns.length > 0 
        ? Math.round(((withNotes / workTxns.length) * 50) + ((withCategory / workTxns.length) * 50))
        : 0;

      const threeMonthsAgo = subMonths(new Date(), 3);
      const recentExpenses = txns?.filter(t => t.amount < 0 && new Date(t.transaction_date) >= threeMonthsAgo) || [];
      const burnRate = recentExpenses.reduce((s, t) => s + Math.abs(t.amount), 0) / 3;

      const { data: latestSavings } = await supabase
        .from('finance_entries')
        .select('amount')
        .eq('account', 'Savings')
        .order('date', { ascending: false })
        .limit(1)
        .single();
      
      const runway = burnRate > 0 ? (latestSavings?.amount || 0) / burnRate : 0;

      setBusinessStats({
        totalClients: clients?.length || 0,
        outstandingAmount: clients?.reduce((s, c) => s + (c.total_receivable || 0), 0) || 0,
        recentInvoices: invoices || [],
        taxReadiness: readiness,
        burnRate,
        runway
      });
    } catch (error) {}
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Coffee, color: 'text-amber-500' };
    if (hour < 18) return { text: 'Good Afternoon', icon: Sun, color: 'text-orange-500' };
    return { text: 'Good Evening', icon: Moon, color: 'text-indigo-500' };
  };

  const greeting = getGreeting();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <greeting.icon className={cn("w-5 h-5", greeting.color)} />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{greeting.text}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Command Center
          </h1>
          <p className="text-muted-foreground text-lg">Welcome back, {session?.user.email?.split('@')[0]}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Status</span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 rounded-full font-bold gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ALL SYSTEMS NOMINAL
            </Badge>
          </div>
        </div>
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
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {businessStats && (
                <Card className="border-0 shadow-2xl bg-gradient-to-br from-primary via-indigo-600 to-purple-700 text-white overflow-hidden relative group animate-slide-up opacity-0 stagger-2">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                  <CardContent className="p-8 relative">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-black uppercase tracking-widest opacity-70">Business Health</p>
                        <p className="text-5xl font-black tracking-tighter">
                          <AnimatedNumber 
                            value={businessStats.outstandingAmount} 
                            formatter={(val) => formatCurrency(val)} 
                          />
                        </p>
                        <p className="text-sm font-medium opacity-80">Total Outstanding Receivables</p>
                      </div>
                      <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md group-hover:scale-110 transition-transform duration-500">
                        <Briefcase className="w-10 h-10" />
                      </div>
                    </div>
                    
                    <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="opacity-70">Tax Readiness</span>
                            <span>{businessStats.taxReadiness}%</span>
                          </div>
                          <Progress value={businessStats.taxReadiness} className="h-2 bg-white/20 [&>div]:bg-white" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-[10px] font-bold uppercase opacity-60">Burn Rate</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="opacity-40 hover:opacity-100 transition-opacity"><Info className="w-2.5 h-2.5" /></button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white text-foreground border-0 shadow-xl rounded-xl p-3 max-w-[200px]">
                                    <p className="text-xs font-medium leading-relaxed">Average monthly spending over the last 3 months.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-lg font-black">
                              <AnimatedNumber value={businessStats.burnRate} formatter={(val) => formatCurrency(val)} />
                              <span className="text-[10px] font-medium opacity-60">/mo</span>
                            </p>
                          </div>
                          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-[10px] font-bold uppercase opacity-60">Runway</p>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button className="opacity-40 hover:opacity-100 transition-opacity"><Info className="w-2.5 h-2.5" /></button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-white text-foreground border-0 shadow-xl rounded-xl p-3 max-w-[200px]">
                                    <p className="text-xs font-medium leading-relaxed">Estimated months your current savings will last at your current burn rate.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <p className="text-lg font-black">
                              <AnimatedNumber value={businessStats.runway} formatter={(val) => val.toFixed(1)} />
                              <span className="text-[10px] font-medium opacity-60"> months</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button variant="secondary" asChild className="rounded-2xl font-bold px-6 h-12 shadow-xl">
                          <Link to="/invoices">Invoices</Link>
                        </Button>
                        <Button variant="outline" asChild className="rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold px-6 h-12">
                          <Link to="/clients">Clients</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <FinanceChart entries={calculatedEntries} />
              <MonthlySummary entries={calculatedEntries} />
            </div>
            
            <div className="space-y-8">
              <FinanceForm onAddEntry={addEntry} lastEntry={entries[0]} />
              
              {transactionSummary && (
                <CashFlowForecast transactions={transactionSummary.allTransactions} />
              )}

              <Card className="border-0 shadow-xl bg-card overflow-hidden animate-slide-up opacity-0 stagger-3">
                <CardHeader className="pb-3 border-b bg-muted/30">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-2 grid grid-cols-1 gap-1">
                  <Button variant="ghost" asChild className="justify-start h-14 rounded-xl gap-4 group hover:bg-primary/5">
                    <Link to="/time-glance">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                        <CalendarRange className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Time Glance</p>
                        <p className="text-[10px] text-muted-foreground">Day, Week, Month views</p>
                      </div>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start h-14 rounded-xl gap-4 group hover:bg-primary/5">
                    <Link to="/insights">
                      <div className="p-2 rounded-lg bg-violet-100 text-violet-600 group-hover:scale-110 transition-transform">
                        <Brain className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">AI Insights</p>
                        <p className="text-[10px] text-muted-foreground">Smart financial analysis</p>
                      </div>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild className="justify-start h-14 rounded-xl gap-4 group hover:bg-primary/5">
                    <Link to="/transactions">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                        <ListFilter className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">History</p>
                        <p className="text-[10px] text-muted-foreground">Manage all transactions</p>
                      </div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {transactionSummary && transactionSummary.totalTransactions > 0 && (
            <Card className="border-0 shadow-2xl bg-card animate-slide-up opacity-0 stagger-4 overflow-hidden">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl tracking-tight">Transaction Pulse</h3>
                      <p className="text-xs text-muted-foreground">Real-time activity from your linked accounts</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="rounded-xl font-bold">
                    <Link to="/transactions">View Full History</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><ArrowUpRight className="w-4 h-4" /></div>
                      <span className="text-xs text-emerald-700 dark:text-emerald-300 font-black uppercase tracking-widest">Income</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                      <AnimatedNumber value={transactionSummary.totalIncome} formatter={(val) => formatCurrency(val)} />
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><ArrowDownRight className="w-4 h-4" /></div>
                      <span className="text-xs text-rose-700 dark:text-rose-300 font-black uppercase tracking-widest">Expenses</span>
                    </div>
                    <p className="text-3xl font-black text-rose-700 dark:text-rose-300">
                      <AnimatedNumber value={-transactionSummary.totalExpenses} formatter={(val) => formatCurrency(val)} />
                    </p>
                  </div>
                  <div className={cn(
                    "p-6 rounded-3xl border group hover:shadow-lg transition-all",
                    transactionSummary.net >= 0 
                      ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50" 
                      : "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/50"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        transactionSummary.net >= 0 ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                      )}><TrendingUp className="w-4 h-4" /></div>
                      <span className={cn(
                        "text-xs font-black uppercase tracking-widest",
                        transactionSummary.net >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"
                      )}>Net Position</span>
                    </div>
                    <p className={cn(
                      "text-3xl font-black",
                      transactionSummary.net >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      <AnimatedNumber value={transactionSummary.net} formatter={(val) => formatCurrency(val)} />
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recent Activity</p>
                    <div className="h-[1px] flex-1 bg-muted mx-4" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {transactionSummary.recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-4 px-5 rounded-2xl bg-background border hover:border-primary/30 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={cn(
                            "w-3 h-3 rounded-full shrink-0 shadow-sm",
                            t.amount > 0 ? "bg-emerald-500" : "bg-rose-500"
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{t.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{t.category_1}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-base font-black tabular-nums",
                            t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {formatCurrency(t.amount)}
                          </span>
                          <p className="text-[9px] text-muted-foreground font-bold">{format(new Date(t.transaction_date), 'MMM dd')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <footer className="pt-12 pb-6">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;