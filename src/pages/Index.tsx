"use client";

import React, { useState, useEffect, useMemo } from 'react';
import CashFlowForecast from '@/components/CashFlowForecast';
import AnimatedNumber from '@/components/AnimatedNumber';
import SmartAlerts from '@/components/SmartAlerts';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { 
  TrendingUp, 
  ListFilter, 
  Sparkles, 
  Briefcase, 
  Brain, 
  Zap, 
  Clock, 
  Sun, 
  Moon, 
  Coffee, 
  Info, 
  CalendarRange,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  CalendarCheck,
  ChevronRight,
  Loader2,
  Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { subMonths, format } from 'date-fns';
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
  const { selectedYear } = useSettings();
  const [loading, setLoading] = useState(true);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTransactionSummary(),
        fetchBusinessStats()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionSummary = async () => {
    try {
      // Fetch ALL transactions for the period to get accurate totals
      // CRITICAL: Filter out 'Account' category as these are internal transfers
      let query = supabase
        .from('finance_transactions')
        .select('id, description, amount, transaction_date, category_1, is_work, notes')
        .neq('category_1', 'Account')
        .order('transaction_date', { ascending: false });

      if (selectedYear !== 'All') {
        query = query.gte('transaction_date', `${selectedYear}-01-01`).lte('transaction_date', `${selectedYear}-12-31`);
      }

      const { data, error } = await query;

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
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
    }
  };

  const fetchBusinessStats = async () => {
    try {
      const { data: clients } = await supabase.from('clients').select('*');
      
      let invoicesQuery = supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (selectedYear !== 'All') {
        invoicesQuery = invoicesQuery.gte('invoice_date', `${selectedYear}-01-01`).lte('invoice_date', `${selectedYear}-12-31`);
      }

      const { data: invoices } = await invoicesQuery;
      
      setAllClients(clients || []);
      setAllInvoices(invoices || []);

      // Calculate outstanding amount ONLY from the filtered invoices
      const outstanding = (invoices || [])
        .filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled')
        .reduce((s, inv) => s + (inv.total_amount || 0), 0);

      // Calculate tax readiness and burn rate
      let txnsQuery = supabase
        .from('finance_transactions')
        .select('is_work, notes, category_1, amount, transaction_date')
        .neq('category_1', 'Account');

      if (selectedYear !== 'All') {
        txnsQuery = txnsQuery.gte('transaction_date', `${selectedYear}-01-01`).lte('transaction_date', `${selectedYear}-12-31`);
      }
      const { data: txns } = await txnsQuery;
      
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
        outstandingAmount: outstanding,
        recentInvoices: (invoices || []).slice(0, 3),
        taxReadiness: readiness,
        burnRate,
        runway
      });
    } catch (error) {
      console.error("Error fetching business stats:", error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', icon: Coffee, color: 'text-amber-500' };
    if (hour < 18) return { text: 'Good Afternoon', icon: Sun, color: 'text-orange-500' };
    return { text: 'Good Evening', icon: Moon, color: 'text-indigo-500' };
  };

  const greeting = getGreeting();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <greeting.icon className={cn("w-5 h-5", greeting.color)} />
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{greeting.text}</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">Command Center</h1>
          <p className="text-muted-foreground text-lg">Your business intelligence at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 rounded-full font-bold gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE DATA SYNC
          </Badge>
        </div>
      </header>

      {/* Proactive Smart Alerts */}
      {transactionSummary && businessStats && (
        <SmartAlerts 
          transactions={transactionSummary.allTransactions} 
          invoices={allInvoices} 
          clients={allClients} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Business Health Hero */}
          {businessStats && (
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-primary via-indigo-600 to-purple-700 text-white overflow-hidden relative group animate-slide-up">
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
                    <p className="text-sm font-medium opacity-80">Outstanding Receivables ({selectedYear})</p>
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
                        <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Burn Rate</p>
                        <p className="text-lg font-black">
                          {formatCurrency(businessStats.burnRate)}
                          <span className="text-[10px] font-medium opacity-60">/mo</span>
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                        <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Runway</p>
                        <p className="text-lg font-black">
                          {businessStats.runway.toFixed(1)}
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

          {/* Transaction Pulse */}
          {transactionSummary && (
            <Card className="border-0 shadow-2xl bg-card overflow-hidden animate-slide-up stagger-1">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl tracking-tight">Transaction Pulse</h3>
                      <p className="text-xs text-muted-foreground">Activity for {selectedYear}</p>
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
                      {formatCurrency(transactionSummary.totalIncome)}
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 group hover:shadow-lg transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600"><ArrowDownRight className="w-4 h-4" /></div>
                      <span className="text-xs text-rose-700 dark:text-rose-300 font-black uppercase tracking-widest">Expenses</span>
                    </div>
                    <p className="text-3xl font-black text-rose-700 dark:text-rose-300">
                      {formatCurrency(-transactionSummary.totalExpenses)}
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
                      {formatCurrency(transactionSummary.net)}
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
        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          {/* Project ROI Reminder */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative group animate-slide-up">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Profitability</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black">Project ROI Engine</h3>
                <p className="text-sm font-medium opacity-80 leading-relaxed">
                  See your real hourly rate per project. Identify your most profitable work.
                </p>
              </div>
              <Button variant="secondary" asChild className="w-full rounded-xl font-bold gap-2 shadow-lg group-hover:scale-[1.02] transition-transform">
                <Link to="/project-roi">
                  Analyze ROI <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Weekly Routine Reminder */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden relative group animate-slide-up">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Weekly Routine</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black">Thursday Snapshot</h3>
                <p className="text-sm font-medium opacity-80 leading-relaxed">
                  It's time to log your weekly savings and debt snapshot. Keep your progress chart accurate.
                </p>
              </div>
              <Button variant="secondary" asChild className="w-full rounded-xl font-bold gap-2 shadow-lg group-hover:scale-[1.02] transition-transform">
                <Link to="/weekly-routine">
                  Start Routine <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* AI Forecast */}
          {transactionSummary && (
            <CashFlowForecast transactions={transactionSummary.allTransactions} />
          )}

          {/* Quick Actions */}
          <Card className="border-0 shadow-xl bg-card overflow-hidden animate-slide-up stagger-2">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Quick Navigation</CardTitle>
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
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
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

      <footer className="pt-12 pb-6">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default Index;