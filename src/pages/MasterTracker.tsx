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
  Target, 
  Settings as SettingsIcon, 
  Loader2, 
  Calendar,
  Table as TableIcon,
  LayoutGrid,
  List,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Thermometer,
  Clock
} from 'lucide-react';
import { 
  format, 
  startOfYear, 
  endOfYear, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  isSameWeek, 
  isSameMonth, 
  parseISO 
} from 'date-fns';
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

export type TrackerView = 'daily' | 'weekly' | 'monthly' | 'yearly';

const MasterTracker = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [matrixView, setMatrixView] = useState<TrackerView>('monthly');
  const [thermostatView, setThermostatView] = useState<TrackerView>('monthly');

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
          .lt('amount', 0)
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

  const thermostatData = useMemo(() => {
    const today = new Date();
    const catToGroup: Record<string, string> = {};
    categoryGroups.forEach(cg => { catToGroup[cg.category_name] = cg.group_name; });

    return EXPENSE_GROUPS.map(group => {
      // Filter transactions for this group and period
      const groupTxns = transactions.filter(t => {
        const tDate = parseISO(t.transaction_date);
        const isGroup = catToGroup[t.category_1] === group.name;
        if (!isGroup) return false;

        if (thermostatView === 'daily') return isSameDay(tDate, today);
        if (thermostatView === 'weekly') return isSameWeek(tDate, today, { weekStartsOn: 1 });
        if (thermostatView === 'monthly') return isSameMonth(tDate, today);
        return true; // Yearly
      });

      const spent = groupTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
      
      // Get yearly budget for this group
      const yearlyBudget = budgets
        .filter(b => b.category_name === group.name && (b.month === 0 || b.month === null))
        .reduce((s, b) => s + b.amount, 0);

      // Scale budget based on view
      let periodBudget = yearlyBudget;
      if (thermostatView === 'monthly') periodBudget = yearlyBudget / 12;
      if (thermostatView === 'weekly') periodBudget = yearlyBudget / 52;
      if (thermostatView === 'daily') periodBudget = yearlyBudget / 365;

      const remaining = periodBudget - spent;
      const percent = periodBudget > 0 ? (spent / periodBudget) * 100 : 0;

      return {
        ...group,
        spent,
        budget: periodBudget,
        remaining,
        percent
      };
    });
  }, [transactions, budgets, categoryGroups, thermostatView]);

  const matrixStats = useMemo(() => {
    const totalSpent = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const remaining = totalBudget - totalSpent;
    const percentUtilized = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const today = new Date();
    const daysPassed = selectedYear === 'All' || parseInt(selectedYear) === today.getFullYear()
      ? Math.max(1, Math.floor((today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)))
      : 365;
    const avgSpend = totalSpent / daysPassed;

    return { totalSpent, totalBudget, remaining, percentUtilized, avgSpend };
  }, [transactions, budgets, selectedYear]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-10 pb-24">
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
          <Badge variant="outline" className={cn(
            "px-4 py-1.5 rounded-full font-bold text-sm",
            matrixStats.percentUtilized > 100 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            {matrixStats.percentUtilized > 100 ? 'OVER BUDGET' : `${Math.round(100 - matrixStats.percentUtilized)}% UNDER BUDGET`}
          </Badge>
        </div>
      </header>

      {/* Financial Thermostat Section */}
      <section className="space-y-6 animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Financial Thermostat</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Real-time tracking status</p>
            </div>
          </div>

          <div className="flex items-center bg-muted rounded-xl p-1">
            <Button 
              variant={thermostatView === 'daily' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setThermostatView('daily')}
              className="rounded-lg h-8 px-4 text-xs font-bold"
            >
              Day
            </Button>
            <Button 
              variant={thermostatView === 'weekly' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setThermostatView('weekly')}
              className="rounded-lg h-8 px-4 text-xs font-bold"
            >
              Week
            </Button>
            <Button 
              variant={thermostatView === 'monthly' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setThermostatView('monthly')}
              className="rounded-lg h-8 px-4 text-xs font-bold"
            >
              Month
            </Button>
            <Button 
              variant={thermostatView === 'yearly' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setThermostatView('yearly')}
              className="rounded-lg h-8 px-4 text-xs font-bold"
            >
              Year
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {thermostatData.map((group) => (
            <Card key={group.name} className="border-0 shadow-xl hover:shadow-2xl transition-all group overflow-hidden">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className={cn("p-3 rounded-2xl shadow-sm", group.bg, group.color)}>
                    <span className="text-2xl">{group.icon}</span>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-black",
                      group.percent > 100 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {Math.round(group.percent)}%
                    </p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Utilized</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{group.name}</p>
                  <p className="text-2xl font-black tracking-tight">{formatCurrency(group.spent)}</p>
                  <p className="text-[10px] text-muted-foreground font-bold">of {formatCurrency(group.budget)} target</p>
                </div>

                <div className="space-y-2">
                  <Progress 
                    value={group.percent} 
                    className={cn("h-2", group.percent > 100 ? "[&>div]:bg-rose-500" : "[&>div]:bg-emerald-500")} 
                  />
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                    <span className="text-muted-foreground">Left:</span>
                    <span className={cn(group.remaining >= 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrency(group.remaining)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Matrix Section */}
      <section className="space-y-6 animate-slide-up stagger-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <TableIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">The Matrix</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-wider">
                Historical breakdown by category
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center bg-muted rounded-xl p-1">
            <Button 
              variant={matrixView === 'daily' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setMatrixView('daily')}
              className="rounded-lg h-8 px-4 text-xs font-bold gap-2"
            >
              <CalendarDays className="w-3.5 h-3.5" /> Daily
            </Button>
            <Button 
              variant={matrixView === 'weekly' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setMatrixView('weekly')}
              className="rounded-lg h-8 px-4 text-xs font-bold gap-2"
            >
              <CalendarRange className="w-3.5 h-3.5" /> Weekly
            </Button>
            <Button 
              variant={matrixView === 'monthly' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setMatrixView('monthly')}
              className="rounded-lg h-8 px-4 text-xs font-bold gap-2"
            >
              <Calendar className="w-3.5 h-3.5" /> Monthly
            </Button>
            <Button 
              variant={matrixView === 'yearly' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setMatrixView('yearly')}
              className="rounded-lg h-8 px-4 text-xs font-bold gap-2"
            >
              <Zap className="w-3.5 h-3.5" /> Yearly
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-card overflow-hidden">
          <CardContent className="p-0">
            <MasterTrackerMatrix 
              transactions={transactions} 
              budgets={budgets} 
              categoryGroups={categoryGroups}
              year={year}
              view={matrixView}
            />
          </CardContent>
        </Card>
      </section>

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