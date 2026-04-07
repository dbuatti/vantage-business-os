"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
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
  Zap
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
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Progress } from '@/components/ui/progress';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const TimeGlance = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      daysInPeriod
    };
  }, [transactions, view, dateRange]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      else if (sortField === 'amount') comparison = Math.abs(a.amount) - Math.abs(b.amount);
      else comparison = a.description.localeCompare(b.description);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortField, sortOrder]);

  const navigate = (direction: 'prev' | 'next' | 'today') => {
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
            <Button variant="outline" size="sm" onClick={() => navigate('today')} className="rounded-xl h-9 font-bold">Today</Button>
            <div className="flex items-center bg-muted rounded-xl p-1">
              <Button variant="ghost" size="icon" onClick={() => navigate('prev')} className="h-7 w-7 rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('next')} className="h-7 w-7 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
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
                      <Tooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Breakdown */}
          <Card className="border-0 shadow-xl animate-slide-up opacity-0 stagger-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription>Spending and income by category for this period.</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-lg">{stats.categories.length} categories</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {stats.categories.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic">No category data for this period.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  {stats.categories.map((cat, i) => {
                    const totalForType = cat.type === 'income' ? stats.income : stats.expenses;
                    const percentage = totalForType > 0 ? (cat.total / totalForType) * 100 : 0;
                    const color = COLORS[i % COLORS.length];

                    return (
                      <div key={cat.name} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-bold truncate">{cat.name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">({cat.count})</span>
                          </div>
                          <span className={cn("font-black tabular-nums", cat.type === 'income' ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(cat.total)}
                          </span>
                        </div>
                        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </div>
                        <div className="flex justify-end">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{percentage.toFixed(1)}% of {cat.type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Transaction List with Sorting */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-0 shadow-xl overflow-hidden h-full flex flex-col animate-slide-up opacity-0 stagger-2">
            <CardHeader className="bg-muted/20 border-b shrink-0">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Transactions
                </CardTitle>
                <Badge variant="outline" className="rounded-lg">{transactions.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('date')}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest rounded-lg gap-1.5", sortField === 'date' && "bg-primary/10 text-primary")}
                >
                  Date <ArrowUpDown className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('amount')}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest rounded-lg gap-1.5", sortField === 'amount' && "bg-primary/10 text-primary")}
                >
                  Amount <ArrowUpDown className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('description')}
                  className={cn("h-8 text-[10px] font-black uppercase tracking-widest rounded-lg gap-1.5", sortField === 'description' && "bg-primary/10 text-primary")}
                >
                  Name <ArrowUpDown className="w-3 h-3" />
                </Button>
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
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
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