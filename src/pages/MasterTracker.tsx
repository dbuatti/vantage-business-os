"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  LayoutGrid, 
  Calculator, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Settings as SettingsIcon,
  Loader2,
  Sparkles,
  Calendar,
  Table as TableIcon,
  DollarSign
} from 'lucide-react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import MasterTrackerMatrix from '@/components/MasterTrackerMatrix';
import BudgetDialog from '@/components/BudgetDialog';

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', icon: '🏠', color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Flexible Essentials', icon: '🛒', color: 'text-amber-600', bg: 'bg-amber-50' },
  { name: 'Sustenance', icon: '🍽️', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Wellness & Growth', icon: '🌱', color: 'text-violet-600', bg: 'bg-violet-50' },
  { name: 'Lifestyle & Discretionary', icon: '🎭', color: 'text-rose-600', bg: 'bg-rose-50' },
];

const MasterTracker = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);

  const year = parseInt(selectedYear === 'All' ? new Date().getFullYear().toString() : selectedYear);
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  useEffect(() => {
    if (session) fetchData();
  }, [session, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnsRes, groupsRes, budgetsRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('*')
          .gte('transaction_date', format(yearStart, 'yyyy-MM-dd'))
          .lte('transaction_date', format(yearEnd, 'yyyy-MM-dd'))
          .lt('amount', 0) // Only expenses
          .neq('category_1', 'Account'),
        supabase.from('category_groups').select('*'),
        supabase.from('budgets').select('*').eq('year', year)
      ]);

      setTransactions(txnsRes.data || []);
      setCategoryGroups(groupsRes.data || []);
      setBudgets(budgetsRes.data || []);
    } catch (error) {
      console.error("Error fetching master tracker data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalSpent = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const remaining = totalBudget - totalSpent;
    const percentUtilized = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    // Group mapping
    const catToGroup: Record<string, string> = {};
    categoryGroups.forEach(cg => { catToGroup[cg.category_name] = cg.group_name; });

    // Group totals
    const groupData = EXPENSE_GROUPS.map(group => {
      const groupSpent = transactions
        .filter(t => catToGroup[t.category_1] === group.name)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      
      const groupBudget = budgets
        .filter(b => b.category_name === group.name)
        .reduce((s, b) => s + b.amount, 0);

      return {
        ...group,
        spent: groupSpent,
        budget: groupBudget,
        remaining: groupBudget - groupSpent,
        percent: groupBudget > 0 ? (groupSpent / groupBudget) * 100 : 0
      };
    });

    // Daily average
    const today = new Date();
    const daysPassed = selectedYear === 'All' || parseInt(selectedYear) === today.getFullYear()
      ? Math.max(1, Math.floor((today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)))
      : 365;
    const avgSpend = totalSpent / daysPassed;

    return { totalSpent, totalBudget, remaining, percentUtilized, groupData, avgSpend };
  }, [transactions, budgets, categoryGroups, selectedYear]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <Target className="w-7 h-7" />
            </div>
            Master Tracker {year}
          </h1>
          <p className="text-muted-foreground mt-1">Your financial command center for the year.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowBudgetDialog(true)} className="rounded-xl gap-2">
            <SettingsIcon className="w-4 h-4" /> Set Budgets
          </Button>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-4 py-1.5 rounded-full font-bold text-sm">
            {Math.round(100 - stats.percentUtilized)}% UNDER BUDGET
          </Badge>
        </div>
      </header>

      {/* Top Level Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        <Card className="border-0 shadow-xl bg-primary text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Year Budget</p>
            <p className="text-3xl font-black">{formatCurrency(stats.totalBudget)}</p>
            <p className="text-xs opacity-70 mt-2">Total planned for {year}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-rose-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Year Spent</p>
            <p className="text-3xl font-black">{formatCurrency(stats.totalSpent)}</p>
            <p className="text-xs opacity-70 mt-2">{Math.round(stats.percentUtilized)}% utilized</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Remaining Buffer</p>
            <p className="text-3xl font-black">{formatCurrency(stats.remaining)}</p>
            <p className="text-xs opacity-70 mt-2">Safe to spend</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-indigo-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Avg. Daily Spend</p>
            <p className="text-3xl font-black">{formatCurrency(stats.avgSpend)}</p>
            <p className="text-xs opacity-70 mt-2">Current burn rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Group Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 animate-slide-up stagger-1">
        {stats.groupData.map((group) => (
          <Card key={group.name} className="border-0 shadow-lg hover:shadow-xl transition-all group">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-xl", group.bg, group.color)}>
                  <span className="text-xl">{group.icon}</span>
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase">
                  {Math.round(group.percent)}%
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{group.name}</p>
                <p className="text-xl font-black">{formatCurrency(group.spent)}</p>
                <p className="text-[10px] text-muted-foreground font-bold">of {formatCurrency(group.budget)}</p>
              </div>
              <Progress value={group.percent} className="h-1.5" />
              <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                <span className="text-muted-foreground">Left:</span>
                <span className={cn(group.remaining >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(group.remaining)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* The Matrix */}
      <Card className="border-0 shadow-2xl bg-card overflow-hidden animate-slide-up stagger-2">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <TableIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Yearly Matrix</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-wider">Monthly breakdown by category</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <MasterTrackerMatrix 
            transactions={transactions} 
            budgets={budgets} 
            categoryGroups={categoryGroups}
            year={year}
          />
        </CardContent>
      </Card>

      <BudgetDialog 
        open={showBudgetDialog} 
        onOpenChange={setShowBudgetDialog} 
        year={year}
        onSuccess={fetchData}
        existingBudgets={budgets}
      />
    </div>
  );
};

export default MasterTracker;