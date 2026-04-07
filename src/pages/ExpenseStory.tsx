"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calculator, 
  Info, 
  Plus as PlusIcon, 
  Equal, 
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  History,
  CreditCard,
  Zap,
  AlertTriangle,
  Briefcase,
  DollarSign
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
  parseISO,
  differenceInDays
} from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types/finance';

const ExpenseStory = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [view, setView] = useState<'day' | 'week' | 'month'>((searchParams.get('view') as any) || 'week');
  const [currentDate, setCurrentDate] = useState(searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    if (view === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    if (view === 'week') return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }, [currentDate, view]);

  useEffect(() => {
    fetchTransactions();
    // Update URL params
    setSearchParams({ 
      view, 
      date: format(currentDate, 'yyyy-MM-dd') 
    }, { replace: true });
  }, [dateRange, view]);

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
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const expenseTxns = transactions.filter(t => t.amount < 0);
    const expenses = expenseTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
    
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

    return { 
      expenses, 
      expenseTxns,
      breakdown: {
        bigHits: { items: bigHits, total: bigHitsTotal },
        subscriptions: { items: subscriptions, total: subscriptionsTotal },
        dailyLife: { items: dailyLife, total: dailyLifeTotal },
        smallStuff: { items: smallStuff, total: smallStuffTotal }
      }
    };
  }, [transactions]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const amount = direction === 'next' ? 1 : -1;
    if (view === 'day') setCurrentDate(addDays(currentDate, amount));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, amount));
    else setCurrentDate(addMonths(currentDate, amount));
  };

  const getTitle = () => {
    if (view === 'day') return format(currentDate, 'EEEE, MMMM dd');
    if (view === 'week') return `${format(dateRange.start, 'MMM dd')} — ${format(dateRange.end, 'MMM dd, yyyy')}`;
    return format(currentDate, 'MMMM yyyy');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/time-glance')} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              The Expense Story
            </h1>
            <p className="text-muted-foreground mt-1">A deep dive into your spending narrative.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-xl p-1">
            <Button variant={view === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setView('day')} className="rounded-lg h-8 px-4 text-xs font-bold">Day</Button>
            <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setView('week')} className="rounded-lg h-8 px-4 text-xs font-bold">Week</Button>
            <Button variant={view === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setView('month')} className="rounded-lg h-8 px-4 text-xs font-bold">Month</Button>
          </div>
          <div className="flex items-center bg-muted rounded-xl p-1">
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')} className="h-7 w-7 rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')} className="h-7 w-7 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center">
        <Badge variant="secondary" className="px-6 py-2 rounded-full text-lg font-black tracking-tight bg-primary/5 text-primary border-primary/10">
          {getTitle()}
        </Badge>
      </div>

      {/* The Equation Visual */}
      <Card className="border-0 shadow-2xl bg-card overflow-hidden">
        <CardHeader className="pb-4 border-b bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">The Visual Equation</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-wider">Breaking down {formatCurrency(stats.expenses)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-12">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-center space-y-3">
              <div className="p-6 rounded-[2.5rem] bg-rose-50 border-2 border-rose-100 shadow-sm">
                <p className="text-4xl font-black text-rose-600">{formatCurrency(stats.breakdown.bigHits.total)}</p>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">The Big Hits</p>
            </div>
            
            <PlusIcon className="w-6 h-6 text-muted-foreground/40" />

            <div className="text-center space-y-3">
              <div className="p-6 rounded-[2.5rem] bg-blue-50 border-2 border-blue-100 shadow-sm">
                <p className="text-4xl font-black text-blue-600">{formatCurrency(stats.breakdown.subscriptions.total)}</p>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Subscriptions</p>
            </div>

            <PlusIcon className="w-6 h-6 text-muted-foreground/40" />

            <div className="text-center space-y-3">
              <div className="p-6 rounded-[2.5rem] bg-amber-50 border-2 border-amber-100 shadow-sm">
                <p className="text-4xl font-black text-amber-600">{formatCurrency(stats.breakdown.dailyLife.total)}</p>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Daily Life</p>
            </div>

            <Equal className="w-6 h-6 text-muted-foreground/40" />

            <div className="text-center space-y-3">
              <div className="p-8 rounded-[3rem] bg-primary text-white shadow-2xl shadow-primary/30">
                <p className="text-5xl font-black">{formatCurrency(stats.expenses)}</p>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-primary">Total Spent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Big Hits */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-rose-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" /> The Big Hits
            </h3>
            <Badge variant="outline" className="rounded-lg">{stats.breakdown.bigHits.items.length}</Badge>
          </div>
          <div className="space-y-3">
            {stats.breakdown.bigHits.items.map((t, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(parseISO(t.transaction_date), 'MMM dd')}</p>
                  </div>
                  <p className="text-lg font-black text-rose-600 tabular-nums">{formatCurrency(Math.abs(t.amount))}</p>
                </CardContent>
              </Card>
            ))}
            {stats.breakdown.bigHits.items.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground italic">No large transactions found.</p>
            )}
          </div>
        </div>

        {/* Subscriptions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Subscriptions
            </h3>
            <Badge variant="outline" className="rounded-lg">{stats.breakdown.subscriptions.items.length}</Badge>
          </div>
          <div className="space-y-3">
            {stats.breakdown.subscriptions.items.map((t, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(parseISO(t.transaction_date), 'MMM dd')}</p>
                  </div>
                  <p className="text-lg font-black text-blue-600 tabular-nums">{formatCurrency(Math.abs(t.amount))}</p>
                </CardContent>
              </Card>
            ))}
            {stats.breakdown.subscriptions.items.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground italic">No subscriptions found.</p>
            )}
          </div>
        </div>

        {/* Daily Life */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Daily Life
            </h3>
            <Badge variant="outline" className="rounded-lg">{stats.breakdown.dailyLife.items.length}</Badge>
          </div>
          <div className="space-y-3">
            {stats.breakdown.dailyLife.items.map((t, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{format(parseISO(t.transaction_date), 'MMM dd')}</p>
                  </div>
                  <p className="text-lg font-black text-amber-600 tabular-nums">{formatCurrency(Math.abs(t.amount))}</p>
                </CardContent>
              </Card>
            ))}
            {stats.breakdown.dailyLife.items.length === 0 && (
              <p className="text-center py-8 text-sm text-muted-foreground italic">No daily life transactions found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Plain English Analysis */}
      <Card className="border-0 shadow-2xl bg-slate-900 text-white overflow-hidden">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black">Plain English Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-lg leading-relaxed text-slate-300">
                This period, <span className="text-white font-bold">{Math.round((stats.breakdown.bigHits.total / stats.expenses) * 100)}%</span> of your spending came from just <span className="text-white font-bold">{stats.breakdown.bigHits.items.length} large transactions</span>. 
                These "Big Hits" are the primary drivers of your financial narrative right now.
              </p>
              <p className="text-lg leading-relaxed text-slate-300">
                Your recurring commitments (subscriptions) account for <span className="text-white font-bold">{formatCurrency(stats.breakdown.subscriptions.total)}</span>, which is <span className="text-white font-bold">{Math.round((stats.breakdown.subscriptions.total / stats.expenses) * 100)}%</span> of your total burn.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-widest text-xs">
                  <AlertTriangle className="w-4 h-4" /> Attention Needed
                </div>
                <p className="text-sm text-slate-400">
                  You had <span className="text-white font-bold">{stats.breakdown.smallStuff.items.length} small purchases</span> under $20. 
                  While they seem minor, they added up to <span className="text-white font-bold">{formatCurrency(stats.breakdown.smallStuff.total)}</span>.
                </p>
              </div>
              
              <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-widest text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Efficiency Tip
                </div>
                <p className="text-sm text-slate-400">
                  Focusing on reducing just one "Big Hit" next period will have a greater impact than cutting all small daily life expenses combined.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseStory;