"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { 
  Target, 
  Save, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  Percent, 
  DollarSign,
  ArrowDown,
  Calculator,
  TrendingDown,
  History,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { format, subYears, differenceInMonths, parseISO } from 'date-fns';

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  onSuccess: () => void;
  existingBudgets: Array<{ category_name: string; amount: number; month: number | null }>;
}

const GROUPS = [
  'Fixed Essentials',
  'Flexible Essentials',
  'Sustenance',
  'Wellness & Growth',
  'Lifestyle & Discretionary'
];

const BudgetDialog = ({ open, onOpenChange, year, onSuccess, existingBudgets }: BudgetDialogProps) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formBudgets, setFormBudgets] = useState<Array<{ category_name: string; amount: number | string }>>([]);
  const [formCategoryBudgets, setFormCategoryBudgets] = useState<Array<{ category_name: string; amount: number | string }>>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [catToGroup, setCatToGroup] = useState<Record<string, string>>({});
  
  const [savingsType, setSavingsType] = useState<'percent' | 'dollar'>('percent');
  const [savingsValue, setSavingsValue] = useState<string>('20');
  
  const [historicalData, setHistoricalData] = useState<{
    groupTotals: Record<string, number>;
    categoryTotals: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
    monthsOfData: number;
  }>({ groupTotals: {}, categoryTotals: {}, totalIncome: 0, totalExpenses: 0, monthsOfData: 0 });

  const [baseYear, setBaseYear] = useState<number>(year - 1);
  const [priorYearData, setPriorYearData] = useState<{
    groupMonthly: Record<string, number>;
    categoryMonthly: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
    hasData: boolean;
  }>({ groupMonthly: {}, categoryMonthly: {}, totalIncome: 0, totalExpenses: 0, hasData: false });

  const fetchPriorYearData = useCallback(async (targetYear: number) => {
    if (!session) return;
    try {
      const start = `${targetYear}-01-01`;
      const end = `${targetYear}-12-31`;

      const [txnsRes, groupsRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('amount, category_1')
          .neq('category_1', 'Account')
          .lt('amount', 0)
          .gte('transaction_date', start)
          .lte('transaction_date', end),
        supabase.from('category_groups').select('*')
      ]);

      if (txnsRes.error) throw txnsRes.error;

      const catToGroupLocal: Record<string, string> = {};
      groupsRes.data?.forEach(cg => { catToGroupLocal[cg.category_name] = cg.group_name; });

      const groupTotals: Record<string, number> = {};
      const categoryTotals: Record<string, number> = {};
      GROUPS.forEach(g => groupTotals[g] = 0);

      let totalExpenses = 0;
      txnsRes.data?.forEach(t => {
        const absAmount = Math.abs(t.amount);
        totalExpenses += absAmount;
        const group = catToGroupLocal[t.category_1];
        if (group && groupTotals[group] !== undefined) {
          groupTotals[group] += absAmount;
          categoryTotals[t.category_1] = (categoryTotals[t.category_1] || 0) + absAmount;
        }
      });

      const groupMonthly: Record<string, number> = {};
      GROUPS.forEach(g => groupMonthly[g] = Math.round((groupTotals[g] || 0) / 12));

      const categoryMonthly: Record<string, number> = {};
      Object.entries(categoryTotals).forEach(([cat, total]) => {
        categoryMonthly[cat] = Math.round(total / 12);
      });

      setPriorYearData({
        groupMonthly,
        categoryMonthly,
        totalIncome: 0,
        totalExpenses,
        hasData: txnsRes.data !== null && txnsRes.data.length > 0,
      });
      setCatToGroup(catToGroupLocal);
    } catch (error) {
      console.error("Error fetching prior year data:", error);
      setPriorYearData({ groupMonthly: {}, totalIncome: 0, totalExpenses: 0, hasData: false });
    }
  }, [session]);

  const fetchHistoricalData = useCallback(async () => {
    if (!session) return;
    setAnalyzing(true);
    try {
      const oneYearAgo = format(subYears(new Date(), 1), 'yyyy-MM-dd');
      
      const [txnsRes, groupsRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('amount, category_1, transaction_date')
          .neq('category_1', 'Account')
          .gte('transaction_date', oneYearAgo),
        supabase.from('category_groups').select('*')
      ]);

      if (txnsRes.error) throw txnsRes.error;

      const catToGroupLocal: Record<string, string> = {};
      groupsRes.data?.forEach(cg => { catToGroupLocal[cg.category_name] = cg.group_name; });

      let totalIncome = 0;
      let totalExpenses = 0;
      const groupTotals: Record<string, number> = {};
      const categoryTotals: Record<string, number> = {};
      GROUPS.forEach(g => groupTotals[g] = 0);

      const dates = txnsRes.data?.map(t => parseISO(t.transaction_date)) || [];
      const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
      const monthsOfData = Math.max(1, differenceInMonths(new Date(), minDate) + (new Date().getDate() / 30));

      txnsRes.data?.forEach(t => {
        if (t.amount > 0) {
          totalIncome += t.amount;
        } else {
          const absAmount = Math.abs(t.amount);
          totalExpenses += absAmount;
          const group = catToGroupLocal[t.category_1];
          if (group && groupTotals[group] !== undefined) {
            groupTotals[group] += absAmount;
            categoryTotals[t.category_1] = (categoryTotals[t.category_1] || 0) + absAmount;
          }
        }
      });

      setHistoricalData({ groupTotals, categoryTotals, totalIncome, totalExpenses, monthsOfData });
      setCatToGroup(catToGroupLocal);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      showError(error instanceof Error ? error.message : 'Failed to load historical data');
    } finally {
      setAnalyzing(false);
    }
  }, [session]);

  useEffect(() => {
    if (open) {
      const initial = GROUPS.map(group => {
        const existing = existingBudgets.find(b => b.category_name === group && (b.month === 0 || b.month === null));
        return {
          category_name: group,
          amount: existing?.amount || 0,
        };
      });
      setFormBudgets(initial);

      const existingCategoryNames = new Set(GROUPS.map(g => g));
      const initialCategories = existingBudgets
        .filter(b => (b.month === 0 || b.month === null) && !existingCategoryNames.has(b.category_name))
        .map(b => ({ category_name: b.category_name, amount: b.amount }));
      setFormCategoryBudgets(initialCategories);
      fetchHistoricalData();
    }
  }, [open, existingBudgets, fetchHistoricalData]);

  useEffect(() => {
    if (open) fetchPriorYearData(baseYear);
  }, [open, baseYear, fetchPriorYearData]);

  const categoriesByGroup = useMemo(() => {
    const map: Record<string, string[]> = {};
    const addCat = (cat: string) => {
      const group = catToGroup[cat];
      if (!group || !GROUPS.includes(group)) return;
      (map[group] = map[group] || []).push(cat);
    };
    Object.keys(catToGroup).forEach(addCat);
    existingBudgets
      .filter(b => b.month === 0 || b.month === null)
      .forEach(b => addCat(b.category_name));
    Object.values(map).forEach(arr => arr.sort());
    return map;
  }, [catToGroup, existingBudgets]);

  useEffect(() => {
    if (!open) return;
    const existingNames = new Set(formCategoryBudgets.map(b => b.category_name));
    const missing: Array<{ category_name: string; amount: number }> = [];
    Object.values(categoriesByGroup).forEach(cats => {
      cats.forEach(cat => {
        if (existingNames.has(cat)) return;
        const existing = existingBudgets.find(b => b.category_name === cat && (b.month === 0 || b.month === null));
        missing.push({ category_name: cat, amount: existing?.amount || 0 });
      });
    });
    if (missing.length > 0) {
      setFormCategoryBudgets(prev => [...prev, ...missing]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoriesByGroup]);

  const adjustedSuggestions = useMemo(() => {
    const { totalIncome, groupTotals, totalExpenses, monthsOfData } = historicalData;
    
    const annualFactor = 12 / monthsOfData;
    const annualizedIncome = totalIncome * annualFactor;
    const annualizedExpenses = totalExpenses * annualFactor;
    
    if (annualizedIncome === 0) return {
      adjusted: groupTotals,
      targetSavings: 0,
      availableForExpenses: 0,
      isScaling: false,
      scaleFactor: 1,
      annualizedIncome: 0,
      annualizedExpenses: 0
    };

    const targetSavings = savingsType === 'percent' 
      ? (annualizedIncome * (parseFloat(savingsValue) || 0) / 100)
      : (parseFloat(savingsValue) || 0);

    const availableForExpenses = Math.max(0, annualizedIncome - targetSavings);
    const scaleFactor = annualizedExpenses > 0 ? availableForExpenses / annualizedExpenses : 1;

    const adjusted: Record<string, number> = {};
    GROUPS.forEach(g => {
      adjusted[g] = Math.round((groupTotals[g] || 0) * annualFactor * scaleFactor);
    });

    return {
      adjusted,
      targetSavings,
      availableForExpenses,
      isScaling: scaleFactor < 1,
      scaleFactor,
      annualizedIncome,
      annualizedExpenses
    };
  }, [historicalData, savingsType, savingsValue]);

  const groupCategoryShare = useCallback((group: string, cat: string) => {
    const groupTotal = historicalData.groupTotals[group] || 0;
    const catTotal = historicalData.categoryTotals[cat] || 0;
    const cats = (categoriesByGroup[group] || []).filter(c => (historicalData.categoryTotals[c] || 0) > 0);
    if (cats.length === 0) return 1;
    if (groupTotal > 0 && catTotal > 0) return catTotal / groupTotal;
    return 1 / cats.length;
  }, [historicalData, categoriesByGroup]);

  const suggestCategory = useCallback((group: string, cat: string) => {
    const groupAdjusted = adjustedSuggestions.adjusted[group] || 0;
    return Math.round(groupAdjusted * groupCategoryShare(group, cat));
  }, [adjustedSuggestions, groupCategoryShare]);

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const toUpsert = [
        ...formBudgets.map(b => ({
          user_id: session.user.id,
          category_name: b.category_name,
          amount: parseFloat(b.amount) || 0,
          year,
          month: 0,
          updated_at: new Date().toISOString()
        })),
        ...formCategoryBudgets.map(b => ({
          user_id: session.user.id,
          category_name: b.category_name,
          amount: parseFloat(b.amount) || 0,
          year,
          month: 0,
          updated_at: new Date().toISOString()
        }))
      ];

      const { error } = await supabase
        .from('budgets')
        .upsert(toUpsert, { onConflict: 'user_id,category_name,year,month' });

      if (error) throw error;
      showSuccess('Budgets updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const setGroupAmount = (groupName: string, val: string) => {
    setFormBudgets(prev => prev.map(b => b.category_name === groupName ? { ...b, amount: val } : b));
  };

  const setCategoryAmount = (cat: string, val: string) => {
    setFormCategoryBudgets(prev => prev.map(b => b.category_name === cat ? { ...b, amount: val } : b));
  };

  const applyGroupSuggestion = (groupName: string) => {
    const val = adjustedSuggestions.adjusted[groupName];
    setGroupAmount(groupName, val.toString());
    (categoriesByGroup[groupName] || []).forEach(cat => {
      setCategoryAmount(cat, suggestCategory(groupName, cat).toString());
    });
  };

  const applyCategorySuggestion = (groupName: string, cat: string) => {
    setCategoryAmount(cat, suggestCategory(groupName, cat).toString());
  };

  const applyAllSuggestions = () => {
    const next = formBudgets.map(b => ({
      ...b,
      amount: (adjustedSuggestions.adjusted[b.category_name] || 0).toString()
    }));
    setFormBudgets(next);
    setFormCategoryBudgets(prev => prev.map(b => {
      const group = catToGroup[b.category_name];
      if (!group) return b;
      return { ...b, amount: suggestCategory(group, b.category_name).toString() };
    }));
    showSuccess('Applied savings-adjusted suggestions');
  };

  const applyGroupPriorYear = (groupName: string) => {
    const val = priorYearData.groupMonthly[groupName];
    if (!val) return;
    setGroupAmount(groupName, val.toString());
    (categoriesByGroup[groupName] || []).forEach(cat => {
      const catVal = priorYearData.categoryMonthly[cat];
      if (catVal) setCategoryAmount(cat, catVal.toString());
    });
  };

  const applyCategoryPriorYear = (cat: string) => {
    const val = priorYearData.categoryMonthly[cat];
    if (!val) return;
    setCategoryAmount(cat, val.toString());
  };

  const applyAllPriorYear = () => {
    if (!priorYearData.hasData) {
      showError(`No spending data found for ${baseYear}`);
      return;
    }
    const next = formBudgets.map(b => ({
      ...b,
      amount: (priorYearData.groupMonthly[b.category_name] || 0).toString()
    }));
    setFormBudgets(next);
    setFormCategoryBudgets(prev => prev.map(b => {
      const val = priorYearData.categoryMonthly[b.category_name];
      return val ? { ...b, amount: val.toString() } : b;
    }));
    showSuccess(`Applied ${baseYear} spending as budgets`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden border-0 shadow-sm max-h-[90vh] flex flex-col">
        {/* Header Section - Fixed */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 shrink-0">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Calculator className="w-5 h-5 text-primary" />
                  Savings Strategy ({year})
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Set a savings goal to see how your budgets should be adjusted.
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    Based on {historicalData.monthsOfData.toFixed(1)} months
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Card className="border-0 shadow-lg bg-primary text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 opacity-70" />
                    <span className="text-xs font-semibold uppercase tracking-widest opacity-70">I want to save...</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-white/60">
                        {savingsType === 'percent' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                      </span>
                      <Input 
                        type="number"
                        value={savingsValue}
                        onChange={(e) => setSavingsValue(e.target.value)}
                        className="h-14 pl-10 rounded-2xl bg-white/10 border-white/20 text-white font-black text-2xl focus:bg-white/20 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSavingsType('percent')}
                        className={cn("h-7 rounded-lg text-[10px] font-bold uppercase", savingsType === 'percent' ? "bg-white text-primary" : "text-white hover:bg-white/10")}
                      >
                        Percent
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSavingsType('dollar')}
                        className={cn("h-7 rounded-lg text-[10px] font-bold uppercase", savingsType === 'dollar' ? "bg-white text-primary" : "text-white hover:bg-white/10")}
                      >
                        Dollar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-2xl bg-black/10 backdrop-blur-sm border border-white/10">
                  <div className="flex justify-between text-xs font-bold uppercase opacity-70">
                    <span>Target Savings</span>
                    <span>{formatCurrency(adjustedSuggestions.targetSavings)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold uppercase opacity-70">
                    <span>Available for Spend</span>
                    <span>{formatCurrency(adjustedSuggestions.availableForExpenses)}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs font-semibold opacity-70">Projected Annual Income</span>
                    <span className="font-bold">{formatCurrency(adjustedSuggestions.annualizedIncome)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sub-header - Fixed */}
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 border-b bg-background">
          <div className="flex flex-wrap items-center gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ArrowDown className="w-3 h-3" /> Adjusted Budget Targets
            </h3>
            {adjustedSuggestions.scaleFactor !== 1 && (
              <Badge variant="outline" className={cn(
                "text-xs font-semibold opacity-70",
                adjustedSuggestions.scaleFactor < 1 ? "text-danger border-danger-border bg-danger-bg" : "text-profit border-profit-border bg-profit-bg"
              )}>
                {adjustedSuggestions.scaleFactor < 1 ? 'Spending Cut Required' : 'Spending Increase Possible'}
              </Badge>
            )}
            <div className="flex items-center gap-2 px-2 py-1 rounded-xl bg-muted/50 border">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={baseYear}
                onChange={(e) => setBaseYear(parseInt(e.target.value))}
                className="bg-transparent text-xs font-semibold text-muted-foreground outline-none"
                aria-label="Base budget on year"
              >
                <option value={year - 1}>Base on {year - 1}</option>
                <option value={year - 2}>Base on {year - 2}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={applyAllPriorYear}
              disabled={!priorYearData.hasData}
              className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 h-8 text-[10px] font-bold uppercase"
            >
              <History className="w-3 h-3" />
              Use {baseYear} Actuals
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={applyAllSuggestions}
              disabled={analyzing}
              className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 h-8 text-[10px] font-bold uppercase"
            >
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Apply Savings Plan
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {formBudgets.map((budget, i) => {
            const groupName = budget.category_name;
            const suggestion = adjustedSuggestions.adjusted[groupName] || 0;
            const historicalAnnual = (historicalData.groupTotals[groupName] || 0) * (12 / historicalData.monthsOfData);
            const isDifferent = Math.abs(parseFloat(budget.amount) - suggestion) > 1;
            const priorYearMonthly = priorYearData.groupMonthly[groupName] || 0;
            const isPriorYear = Math.abs(parseFloat(budget.amount) - priorYearMonthly) <= 1;
            const subCategories = categoriesByGroup[groupName] || [];
            const expanded = expandedGroups[groupName];
            const catBudgetAmount = (cat: string) => {
              const row = formCategoryBudgets.find(b => b.category_name === cat);
              return row ? row.amount : 0;
            };

            return (
              <div key={groupName} className="group p-4 rounded-2xl bg-card border shadow-sm hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      {groupName}
                    </Label>
                    {subCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }))}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                      >
                        {subCategories.length} sub-categories
                        <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-muted-foreground">Current Annualized</p>
                      <p className="text-xs font-bold">{formatCurrency(historicalAnnual)}</p>
                    </div>
                    <button 
                      onClick={() => applyGroupSuggestion(groupName)}
                      className={cn(
                        "flex flex-col items-end p-1.5 rounded-lg border transition-all",
                        isDifferent ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : "bg-muted/50 border-transparent opacity-50"
                      )}
                    >
                      <span className="text-xs font-semibold opacity-70">Suggested</span>
                      <span className="text-xs font-bold">{formatCurrency(suggestion)}</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    value={budget.amount} 
                    onChange={(e) => {
                      const next = [...formBudgets];
                      next[i].amount = e.target.value;
                      setFormBudgets(next);
                    }}
                    className="h-12 pl-8 rounded-xl font-black text-lg bg-muted/30 border-transparent focus:bg-background focus:border-primary/30 transition-all"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {baseYear} actual: <span className="font-semibold text-foreground">{formatCurrency(priorYearMonthly)}</span>/mo
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => applyGroupPriorYear(groupName)}
                    disabled={!priorYearData.hasData || priorYearMonthly === 0}
                    className={cn(
                      "h-7 rounded-lg px-2 text-[10px] font-bold gap-1.5",
                      isPriorYear ? "text-primary" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <History className="w-3 h-3" />
                    Use {baseYear}
                  </Button>
                </div>

                {subCategories.length > 0 && (
                  <div className={cn(
                    "mt-3 space-y-2 pl-3 border-l-2 border-muted/60 overflow-hidden transition-all",
                    expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                  )}>
                    {subCategories.map(cat => {
                      const catSuggestion = suggestCategory(groupName, cat);
                      const catHistoricalAnnual = (historicalData.categoryTotals[cat] || 0) * (12 / historicalData.monthsOfData);
                      const catPriorYear = priorYearData.categoryMonthly[cat] || 0;
                      const catIsDifferent = Math.abs(parseFloat(catBudgetAmount(cat)) - catSuggestion) > 1;
                      const catIsPriorYear = catPriorYear > 0 && Math.abs(parseFloat(catBudgetAmount(cat)) - catPriorYear) <= 1;
                      return (
                        <div key={cat} className="flex flex-col gap-2 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs font-semibold text-foreground">{cat}</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                YTD: <span className="font-bold text-foreground">{formatCurrency(catHistoricalAnnual)}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => applyCategorySuggestion(groupName, cat)}
                                className={cn(
                                  "flex flex-col items-end px-2 py-1 rounded-lg border transition-all",
                                  catIsDifferent ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : "bg-muted/50 border-transparent opacity-50"
                                )}
                              >
                                <span className="text-[9px] font-semibold opacity-70">Suggested</span>
                                <span className="text-[10px] font-bold">{formatCurrency(catSuggestion)}</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">$</span>
                              <Input
                                type="number"
                                value={catBudgetAmount(cat)}
                                onChange={(e) => setCategoryAmount(cat, e.target.value)}
                                className="h-9 pl-7 rounded-lg font-bold text-sm bg-background/60 border-transparent focus:bg-background focus:border-primary/30 transition-all"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => applyCategoryPriorYear(cat)}
                              disabled={!priorYearData.hasData || catPriorYear === 0}
                              className={cn(
                                "h-8 rounded-lg px-2 text-[10px] font-bold gap-1",
                                catIsPriorYear ? "text-primary" : "text-muted-foreground hover:text-primary"
                              )}
                            >
                              <History className="w-3 h-3" />
                              {baseYear}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Section - Fixed */}
        <div className="p-6 border-t bg-muted/10 shrink-0">
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl px-10 h-12 font-bold text-base gap-2 shadow-xl shadow-primary/20">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Strategy
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetDialog;