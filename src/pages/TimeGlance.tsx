"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  Loader2,
  Clock,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart3,
  CalendarDays,
  CalendarRange,
  History,
  ArrowRight,
  Target,
  ArrowUpDown,
  Store,
  Layers,
  Zap,
  AlertTriangle,
  ArrowDown,
  Calculator,
  Info,
  Minus,
  Plus as PlusIcon,
  Equal,
  List
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  startOfMonth, 
  endOfMonth, 
  addMonths, 
  subMonths,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  differenceInDays
} from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types/finance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const TimeGlance = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const navigate = useNavigate();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // Ensure currentDate is within the selected year if not 'All'
  useEffect(() => {
    if (selectedYear !== 'All') {
      const year = parseInt(selectedYear);
      if (currentDate.getFullYear() !== year) {
        setCurrentDate(new Date(year, 0, 1));
      }
    }
  }, [selectedYear]);

  const dateRange = useMemo(() => {
    if (view === 'day') {
      return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    } else if (view === 'week') {
      return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
    } else {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  }, [currentDate, view]);

  useEffect(() => {
    fetchTransactions();
  }, [dateRange]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .gte('transaction_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('transaction_date', format(dateRange.end, 'yyyy-MM-dd'))
        .neq('category_1', 'Account')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const incomeTxns = transactions.filter(t => t.amount > 0);
    const expenseTxns = transactions.filter(t => t.amount < 0);
    
    const income = incomeTxns.reduce((s, t) => s + t.amount, 0);
    const expenses = expenseTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    
    // High Expenses (> $200)
    const highExpenses = expenseTxns
      .filter(t => Math.abs(t.amount) >= 200)
      .sort((a, b) => a.amount - b.amount);

    // Neurodivergent Breakdown Logic - Mutually Exclusive Buckets
    const bigHits = expenseTxns.filter(t => Math.abs(t.amount) >= 100);
    const bigHitsTotal = bigHits.reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const subscriptions = expenseTxns.filter(t => 
      (t.category_1?.toLowerCase() === 'subscription' || t.category_2?.toLowerCase() === 'subscription') && 
      Math.abs(t.amount) < 100
    );
    const subscriptionsTotal = subscriptions.reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const dailyLife = expenseTxns.filter(t => 
      Math.abs(t.amount) < 100 && 
      t.category_1?.toLowerCase() !== 'subscription' && 
      t.category_2?.toLowerCase() !== 'subscription'
    );
    const dailyLifeTotal = dailyLife.reduce((s, t) => s + Math.abs(t.amount), 0);

    const smallStuff = expenseTxns.filter(t => Math.abs(t.amount) < 20);
    const smallStuffTotal = smallStuff.reduce((s, t) => s + Math.abs(t.amount), 0);

    // Category Breakdown
    const categoryMap: Record<string, { total: number, count: number, type: 'income' | 'expense' }> = {};
    transactions.forEach(t => {
      const cat = t.category_1 || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0, type: t.amount > 0 ? 'income' : 'expense' };
      categoryMap[cat].total += Math.abs(t.amount);
      categoryMap[cat].count++;
    });

    const categories = Object.entries(categoryMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    // Merchant Analysis
    const merchantMap: Record<string, number> = {};
    expenseTxns.forEach(t => {
      merchantMap[t.description] = (merchantMap[t.description] || 0) + Math.abs(t.amount);
    });
    const topMerchant = Object.entries(merchantMap).sort((a, b) => b[1] - a[1])[0];

    // Daily Average
    const daysInPeriod = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1);
    const avgDailySpend = expenses / daysInPeriod;

    // Chart Data
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const chartData = days.map(day => {
      const dayTxns = transactions.filter(t => isSameDay(parseISO(t.transaction_date), day));
      return {
        name: format(day, view === 'week' ? 'EEE' : 'dd'),
        income: dayTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
        expenses: dayTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
      };
    });

    return { 
      income, 
      expenses, 
      net: income - expenses, 
      categories, 
      chartData,
      topMerchant,
      avgDailySpend,
      daysInPeriod,
      highExpenses,
      expenseTxns,
      breakdown: {
        bigHits: { items: bigHits, total: bigHitsTotal },
        subscriptions: { items: subscriptions, total: subscriptionsTotal },
        dailyLife: { items: dailyLife, total: dailyLifeTotal },
        smallStuff: { items: smallStuff, total: smallStuffTotal }
      }
    };
  }, [transactions, view, dateRange]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter === 'income') return t.amount > 0;
      if (typeFilter === 'expense') return t.amount < 0;
      return true;
    });
  }, [transactions, typeFilter]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      else if (sortField === 'amount') comparison = Math.abs(a.amount) - Math.abs(b.amount);
      else comparison = a.description.localeCompare(b.description);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  const navigatePeriod = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const amount = direction === 'next' ? 1 : -1;
    let nextDate;
    if (view === 'day') nextDate = addDays(currentDate, amount);
    else if (view === 'week') nextDate = addWeeks(currentDate, amount);
    else nextDate = addMonths(currentDate, amount);
    if (selectedYear !== 'All' && nextDate.getFullYear() !== parseInt(selectedYear)) return;
    setCurrentDate(nextDate);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('desc'); }
  };

  const getTitle = () => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM dd');
    if (view === 'week') return `${format(dateRange.start, 'MMM dd')} — ${format(dateRange.end, 'MMM dd, yyyy')}`;
    return format(currentDate, 'MMMM yyyy');
  };

  const renderTransactionList = (items: Transaction[]) => (
    <ScrollArea className="max-h-[250px] w-[280px] p-3">
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Breakdown ({items.length})</p>
        {items.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No transactions.</p>
        ) : (
          items.map((t, i) => (
            <div key={i} className="flex items-start justify-between gap-3 border-b border-muted/50 pb-1.5 last:border-0">
              <div className="min-w-0">
                <p className="text-[10px] font-bold truncate leading-tight">{t.description}</p>
                <p className="text-[8px] font-medium text-muted-foreground uppercase tracking-tighter">{format(parseISO(t.transaction_date), 'MMM dd')}</p>
              </div>
              <p className="text-[10px] font-black tabular-nums shrink-0">{formatCurrency(Math.abs(t.amount))}</p>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <CalendarRange className="w-7 h-7" />
            </div>
            Time Glance
          </h1>
          <p className="text-muted-foreground mt-1">Focused view of your financial activity in {selectedYear}.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-muted rounded-xl p-1">
            <Button variant={view === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setView('day')} className="rounded-lg h-8 px-4 text-xs font-bold">Day</Button>
            <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setView('week')} className="rounded-lg h-8 px-4 text-xs font-bold">Week</Button>
            <Button variant={view === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setView('month')} className="rounded-lg h-8 px-4 text-xs font-bold">Month</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigatePeriod('today')} className="rounded-xl h-9 font-bold">Today</Button>
            <div className="flex items-center bg-muted rounded-xl p-1">
              <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')} className="h-7 w-7 rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')} className="h-7 w-7 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center py-2">
        <Badge variant="secondary" className="px-6 py-2 rounded-full text-lg font-black tracking-tight bg-primary/5 text-primary border-primary/10">
          {getTitle()}
        </Badge>
      </div>

      {/* Quick Insights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up opacity-0 stagger-1">
        <Card className="border-0 shadow-xl bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-5 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Income</p>
            <p className="text-2xl font-black">{formatCurrency(stats.income)}</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold bg-white/20 w-fit px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" /> {stats.income > 0 ? 'Active' : 'No income'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-rose-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-5 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Expenses</p>
            <p className="text-2xl font-black">{formatCurrency(-stats.expenses)}</p>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold bg-white/20 w-fit px-2 py-0.5 rounded-full">
              <ArrowDownRight className="w-3 h-3" /> {stats.expenses > 0 ? 'Spending' : 'No spend'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-indigo-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-5 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Avg Daily Spend</p>
            <p className="text-2xl font-black">{formatCurrency(stats.avgDailySpend)}</p>
            <p className="text-[10px] opacity-60 mt-1">Over {stats.daysInPeriod} days</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-amber-500 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-5 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Top Merchant</p>
            <p className="text-lg font-black truncate" title={stats.topMerchant?.[0] || 'None'}>
              {stats.topMerchant ? stats.topMerchant[0] : '—'}
            </p>
            <p className="text-[10px] opacity-80 mt-1">{stats.topMerchant ? formatCurrency(stats.topMerchant[1]) : 'No data'}</p>
          </CardContent>
        </Card>
      </div>

      {/* The Expense Story - Neurodivergent Friendly Breakdown */}
      <Card className="border-0 shadow-2xl bg-card overflow-hidden animate-slide-up opacity-0 stagger-2">
        <CardHeader className="pb-4 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <Link 
                to={`/expense-story?view=${view}&date=${format(currentDate, 'yyyy-MM-dd')}`}
                className="group flex items-center gap-2"
              >
                <CardTitle className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">The Expense Story</CardTitle>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
              </Link>
              <CardDescription className="text-xs font-bold uppercase tracking-wider">How your {formatCurrency(stats.expenses)} adds up</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <TooltipProvider delayDuration={0}>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Visual Equation */}
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 flex-1">
                <div className="text-center space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 rounded-3xl bg-rose-50 border border-rose-100 shadow-sm cursor-help hover:scale-105 transition-transform">
                        <p className="text-2xl font-black text-rose-600">{formatCurrency(stats.breakdown.bigHits.total)}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="p-0 border-0 shadow-2xl rounded-xl overflow-hidden bg-card">
                      {renderTransactionList(stats.breakdown.bigHits.items)}
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">The Big Hits (+$100)</p>
                </div>
                
                <PlusIcon className="w-5 h-5 text-muted-foreground/40" />

                <div className="text-center space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 rounded-3xl bg-blue-50 border border-blue-100 shadow-sm cursor-help hover:scale-105 transition-transform">
                        <p className="text-2xl font-black text-blue-600">{formatCurrency(stats.breakdown.subscriptions.total)}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="p-0 border-0 shadow-2xl rounded-xl overflow-hidden bg-card">
                      {renderTransactionList(stats.breakdown.subscriptions.items)}
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subscriptions</p>
                </div>

                <PlusIcon className="w-5 h-5 text-muted-foreground/40" />

                <div className="text-center space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 rounded-3xl bg-amber-50 border border-amber-100 shadow-sm cursor-help hover:scale-105 transition-transform">
                        <p className="text-2xl font-black text-amber-600">{formatCurrency(stats.breakdown.dailyLife.total)}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="p-0 border-0 shadow-2xl rounded-xl overflow-hidden bg-card">
                      {renderTransactionList(stats.breakdown.dailyLife.items)}
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Daily Life</p>
                </div>

                <Equal className="w-5 h-5 text-muted-foreground/40" />

                <div className="text-center space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-5 rounded-[2rem] bg-primary text-white shadow-xl shadow-primary/20 cursor-help hover:scale-105 transition-transform">
                        <p className="text-3xl font-black">{formatCurrency(stats.expenses)}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="p-0 border-0 shadow-2xl rounded-xl overflow-hidden bg-card">
                      {renderTransactionList(stats.expenseTxns)}
                    </TooltipContent>
                  </Tooltip>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Total Spent</p>
                </div>
              </div>

              {/* Plain English Summary */}
              <div className="w-full lg:w-80 space-y-4 p-6 rounded-3xl bg-muted/30 border border-dashed">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                  <Info className="w-4 h-4" /> Plain English
                </div>
                <p className="text-sm leading-relaxed font-medium">
                  This period, <span className="text-rose-600 font-bold">{Math.round((stats.breakdown.bigHits.total / stats.expenses) * 100)}%</span> of your spending came from just <span className="font-bold">{stats.breakdown.bigHits.items.length} large transactions</span>. 
                  {stats.breakdown.smallStuff.total > 50 && (
                    <span className="block mt-2 text-amber-600">
                      ⚠️ You also had <span className="font-bold">{stats.breakdown.smallStuff.items.length} small purchases</span> under $20, totaling <span className="font-bold">{formatCurrency(stats.breakdown.smallStuff.total)}</span>.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Charts & Categories */}
        <div className="lg:col-span-8 space-y-8">
          {view !== 'day' && (
            <Card className="border-0 shadow-xl animate-slide-up opacity-0 stagger-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {view === 'week' ? 'Daily Activity' : 'Monthly Trend'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown with Tabs */}
          <Card className="border-0 shadow-xl animate-slide-up opacity-0 stagger-3">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription>Spending and income by category for this period.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="expenses" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1">
                  <TabsTrigger value="expenses" className="rounded-lg gap-2 py-1.5 px-4 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                    <ArrowDownRight className="w-4 h-4" /> Expenses
                  </TabsTrigger>
                  <TabsTrigger value="income" className="rounded-lg gap-2 py-1.5 px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                    <ArrowUpRight className="w-4 h-4" /> Income
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="expenses" className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {stats.categories.filter(c => c.type === 'expense').length === 0 ? (
                      <div className="col-span-2 py-12 text-center text-muted-foreground italic">No expense data for this period.</div>
                    ) : (
                      stats.categories.filter(c => c.type === 'expense').map((cat, i) => {
                        const percentage = stats.expenses > 0 ? (cat.total / stats.expenses) * 100 : 0;
                        const color = COLORS[i % COLORS.length];
                        return (
                          <div key={cat.name} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-bold truncate">{cat.name}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">({cat.count})</span>
                              </div>
                              <span className="font-black tabular-nums text-rose-600">{formatCurrency(cat.total)}</span>
                            </div>
                            <Progress value={percentage} className="h-2" style={{ '--progress-foreground': color } as any} />
                            <div className="flex justify-end"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{percentage.toFixed(1)}% of expenses</span></div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="income" className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {stats.categories.filter(c => c.type === 'income').length === 0 ? (
                      <div className="col-span-2 py-12 text-center text-muted-foreground italic">No income data for this period.</div>
                    ) : (
                      stats.categories.filter(c => c.type === 'income').map((cat, i) => {
                        const percentage = stats.income > 0 ? (cat.total / stats.income) * 100 : 0;
                        const color = COLORS[i % COLORS.length];
                        return (
                          <div key={cat.name} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-bold truncate">{cat.name}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">({cat.count})</span>
                              </div>
                              <span className="font-black tabular-nums text-emerald-600">{formatCurrency(cat.total)}</span>
                            </div>
                            <Progress value={percentage} className="h-2" style={{ '--progress-foreground': color } as any} />
                            <div className="flex justify-end"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{percentage.toFixed(1)}% of income</span></div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Transaction List with Sorting & Filtering */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-0 shadow-xl overflow-hidden h-full flex flex-col animate-slide-up opacity-0 stagger-2">
            <CardHeader className="bg-muted/20 border-b shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Transactions
                </CardTitle>
                <Badge variant="outline" className="rounded-lg">{filteredTransactions.length}</Badge>
              </div>
              
              <div className="flex items-center bg-background rounded-xl p-1 border">
                <Button variant={typeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTypeFilter('all')} className="flex-1 h-7 text-[10px] font-bold uppercase">All</Button>
                <Button variant={typeFilter === 'expense' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTypeFilter('expense')} className="flex-1 h-7 text-[10px] font-bold uppercase text-rose-600">Exp</Button>
                <Button variant={typeFilter === 'income' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTypeFilter('income')} className="flex-1 h-7 text-[10px] font-bold uppercase text-emerald-600">Inc</Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className={cn("h-8 text-[10px] font-black uppercase tracking-widest rounded-lg gap-1.5", sortField === 'date' && "bg-primary/10 text-primary")}>Date <ArrowUpDown className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleSort('amount')} className={cn("h-8 text-[10px] font-black uppercase tracking-widest rounded-lg gap-1.5", sortField === 'amount' && "bg-primary/10 text-primary")}>Amount <ArrowUpDown className="w-3 h-3" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleSort('description')} className={cn("h-8 text-[10px] font-black uppercase tracking-widest rounded-lg gap-1.5", sortField === 'description' && "bg-primary/10 text-primary")}>Name <ArrowUpDown className="w-3 h-3" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="divide-y h-full overflow-y-auto max-h-[800px]">
                {loading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest">Syncing Data...</p>
                  </div>
                ) : sortedTransactions.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto opacity-50">
                      <History className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-muted-foreground">No activity found</p>
                      <p className="text-sm text-muted-foreground/60">Try navigating to a different period.</p>
                    </div>
                  </div>
                ) : (
                  sortedTransactions.map((t) => (
                    <div key={t.id} className={cn(
                      "p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group",
                      Math.abs(t.amount) >= 200 && t.amount < 0 && "bg-rose-50/30 dark:bg-rose-950/10"
                    )}>
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0 shadow-sm",
                          t.amount > 0 ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{t.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                              {format(parseISO(t.transaction_date), 'MMM dd')}
                            </span>
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 rounded-md uppercase font-black border-primary/10 bg-primary/5 text-primary">
                              {t.category_1}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className={cn(
                          "text-base font-black tabular-nums",
                          t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(t.amount)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TimeGlance;