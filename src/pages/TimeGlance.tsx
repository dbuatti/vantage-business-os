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
  Target
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
  parseISO
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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const TimeGlance = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

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
    const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const categoryData: Record<string, number> = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category_1 || 'Other';
      categoryData[cat] = (categoryData[cat] || 0) + Math.abs(t.amount);
    });

    const pieData = Object.entries(categoryData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    let chartData: any[] = [];
    if (view === 'week' || view === 'month') {
      const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      chartData = days.map(day => {
        const dayTxns = transactions.filter(t => isSameDay(parseISO(t.transaction_date), day));
        return {
          name: format(day, view === 'week' ? 'EEE' : 'dd'),
          income: dayTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
          expenses: dayTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
        };
      });
    }

    return { income, expenses, net: income - expenses, pieData, chartData };
  }, [transactions, view, dateRange]);

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

    // Prevent navigating outside selected year if not 'All'
    if (selectedYear !== 'All') {
      const year = parseInt(selectedYear);
      if (nextDate.getFullYear() !== year) return;
    }
    
    setCurrentDate(nextDate);
  };

  const getTitle = () => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM dd');
    if (view === 'week') return `${format(dateRange.start, 'MMM dd')} — ${format(dateRange.end, 'MMM dd, yyyy')}`;
    return format(currentDate, 'MMMM yyyy');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-slide-up opacity-0 stagger-1">
        <Card className="border-0 shadow-xl bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Income</p>
              <ArrowUpRight className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">{formatCurrency(stats.income)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-rose-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Expenses</p>
              <ArrowDownRight className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">{formatCurrency(-stats.expenses)}</p>
          </CardContent>
        </Card>
        <Card className={cn("border-0 shadow-xl text-white overflow-hidden relative", stats.net >= 0 ? "bg-primary" : "bg-amber-600")}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Net Position</p>
              <TrendingUp className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">{formatCurrency(stats.net)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {view !== 'day' && (
            <Card className="border-0 shadow-xl animate-slide-up opacity-0 stagger-2">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />{view === 'week' ? 'Daily Activity' : 'Monthly Trend'}</CardTitle></CardHeader>
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

          <Card className="border-0 shadow-xl overflow-hidden animate-slide-up opacity-0 stagger-3">
            <CardHeader className="bg-muted/20 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5 text-primary" />Transactions</CardTitle>
                <Badge variant="outline" className="rounded-lg">{transactions.length} items</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm font-bold uppercase tracking-widest">Syncing Data...</p></div>
                ) : transactions.length === 0 ? (
                  <div className="p-20 text-center space-y-4"><div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto opacity-50"><History className="w-10 h-10 text-muted-foreground" /></div><div><p className="font-bold text-lg text-muted-foreground">No activity found</p><p className="text-sm text-muted-foreground/60">Try navigating to a different period.</p></div></div>
                ) : (
                  transactions.map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0 shadow-sm", t.amount > 0 ? "bg-emerald-500" : "bg-rose-500")} />
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{t.description}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">{format(parseISO(t.transaction_date), 'EEE, MMM dd')}</span>
                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 rounded-md uppercase font-black border-primary/10 bg-primary/5 text-primary">{t.category_1}</Badge>
                            {t.is_work && <Badge className="text-[8px] h-4 px-1.5 rounded-md uppercase font-black bg-amber-100 text-amber-700 border-amber-200">Work</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4"><p className={cn("text-base font-black tabular-nums", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(t.amount)}</p></div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-0 shadow-xl animate-slide-up opacity-0 stagger-2">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-primary" />Spending Mix</CardTitle></CardHeader>
            <CardContent>
              {stats.pieData.length > 0 ? (
                <div className="space-y-6">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {stats.pieData.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="font-medium text-muted-foreground">{item.name}</span></div>
                        <span className="font-bold">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="py-12 text-center text-muted-foreground italic text-sm">No spending data to analyze.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TimeGlance;