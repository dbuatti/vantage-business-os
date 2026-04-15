"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
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
  History, 
  TrendingUp, 
  Percent, 
  DollarSign,
  ArrowDown,
  Calculator
} from 'lucide-react';
import { format, subYears } from 'date-fns';

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  onSuccess: () => void;
  existingBudgets: any[];
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
  const [formBudgets, setFormBudgets] = useState<any[]>([]);
  
  // Savings Strategy State
  const [savingsType, setSavingsType] = useState<'percent' | 'dollar'>('percent');
  const [savingsValue, setSavingsValue] = useState<string>('20');
  
  // Historical Data State
  const [historicalData, setHistoricalData] = useState<{
    groupTotals: Record<string, number>;
    totalIncome: number;
    totalExpenses: number;
  }>({ groupTotals: {}, totalIncome: 0, totalExpenses: 0 });

  useEffect(() => {
    if (open) {
      const initial = GROUPS.map(group => {
        const existing = existingBudgets.find(b => b.category_name === group && !b.month);
        return {
          category_name: group,
          amount: existing?.amount || 0,
        };
      });
      setFormBudgets(initial);
      fetchHistoricalData();
    }
  }, [open, existingBudgets]);

  const fetchHistoricalData = async () => {
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

      const catToGroup: Record<string, string> = {};
      groupsRes.data?.forEach(cg => { catToGroup[cg.category_name] = cg.group_name; });

      let totalIncome = 0;
      let totalExpenses = 0;
      const groupTotals: Record<string, number> = {};
      GROUPS.forEach(g => groupTotals[g] = 0);

      txnsRes.data?.forEach(t => {
        if (t.amount > 0) {
          totalIncome += t.amount;
        } else {
          const absAmount = Math.abs(t.amount);
          totalExpenses += absAmount;
          const group = catToGroup[t.category_1];
          if (group && groupTotals[group] !== undefined) {
            groupTotals[group] += absAmount;
          }
        }
      });

      setHistoricalData({ groupTotals, totalIncome, totalExpenses });
    } catch (error) {
      console.error("Error fetching historical data:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Calculate Adjusted Suggestions based on Savings Goal
  const adjustedSuggestions = useMemo(() => {
    const { totalIncome, groupTotals, totalExpenses } = historicalData;
    
    if (totalIncome === 0) return {
      adjusted: groupTotals,
      targetSavings: 0,
      availableForExpenses: 0,
      isScaling: false,
      scaleFactor: 1
    };

    const targetSavings = savingsType === 'percent' 
      ? (totalIncome * (parseFloat(savingsValue) || 0) / 100)
      : (parseFloat(savingsValue) || 0);

    const availableForExpenses = Math.max(0, totalIncome - targetSavings);
    
    // If we need to cut spending to hit the goal, calculate the scale factor
    const scaleFactor = totalExpenses > 0 ? availableForExpenses / totalExpenses : 1;

    const adjusted: Record<string, number> = {};
    GROUPS.forEach(g => {
      adjusted[g] = Math.round((groupTotals[g] || 0) * scaleFactor);
    });

    return {
      adjusted,
      targetSavings,
      availableForExpenses,
      isScaling: scaleFactor < 1,
      scaleFactor
    };
  }, [historicalData, savingsType, savingsValue]);

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const toUpsert = formBudgets.map(b => ({
        user_id: session.user.id,
        category_name: b.category_name,
        amount: parseFloat(b.amount) || 0,
        year,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('budgets')
        .upsert(toUpsert, { onConflict: 'user_id,category_name,year,month' });

      if (error) throw error;
      showSuccess('Budgets updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (groupName: string) => {
    const val = adjustedSuggestions.adjusted[groupName];
    const next = [...formBudgets];
    const idx = next.findIndex(b => b.category_name === groupName);
    if (idx !== -1) {
      next[idx].amount = val.toString();
      setFormBudgets(next);
    }
  };

  const applyAllSuggestions = () => {
    const next = formBudgets.map(b => ({
      ...b,
      amount: (adjustedSuggestions.adjusted[b.category_name] || 0).toString()
    }));
    setFormBudgets(next);
    showSuccess('Applied savings-adjusted suggestions');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Calculator className="w-5 h-5 text-primary" />
                  Savings Strategy ({year})
                </DialogTitle>
                <DialogDescription>
                  Set a savings goal to see how your budgets should be adjusted.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Savings Goal Section */}
          <Card className="border-0 shadow-lg bg-primary text-white overflow-hidden relative mb-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
            <CardContent className="p-6 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 opacity-70" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-70">I want to save...</span>
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
                        className={cn("h-7 rounded-lg text-[10px] font-black uppercase", savingsType === 'percent' ? "bg-white text-primary" : "text-white hover:bg-white/10")}
                      >
                        Percent
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSavingsType('dollar')}
                        className={cn("h-7 rounded-lg text-[10px] font-black uppercase", savingsType === 'dollar' ? "bg-white text-primary" : "text-white hover:bg-white/10")}
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
                    <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">Historical Income</span>
                    <span className="font-black">{formatCurrency(historicalData.totalIncome)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ArrowDown className="w-3 h-3" /> Adjusted Budget Targets
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={applyAllSuggestions}
              disabled={analyzing}
              className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 h-8 text-[10px] font-black uppercase"
            >
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Apply All Suggestions
            </Button>
          </div>

          <ScrollArea className="max-h-[40vh] pr-4 -mr-4">
            <div className="space-y-4 py-2">
              {formBudgets.map((budget, i) => {
                const suggestion = adjustedSuggestions.adjusted[budget.category_name] || 0;
                const historical = historicalData.groupTotals[budget.category_name] || 0;
                const isDifferent = Math.abs(parseFloat(budget.amount) - suggestion) > 1;

                return (
                  <div key={budget.category_name} className="group p-4 rounded-2xl bg-card border shadow-sm hover:border-primary/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                        {budget.category_name}
                      </Label>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Avg Spend</p>
                          <p className="text-xs font-black">{formatCurrency(historical)}</p>
                        </div>
                        <button 
                          onClick={() => applySuggestion(budget.category_name)}
                          className={cn(
                            "flex flex-col items-end p-1.5 rounded-lg border transition-all",
                            isDifferent ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : "bg-muted/50 border-transparent opacity-50"
                          )}
                        >
                          <span className="text-[8px] font-black uppercase">Suggested</span>
                          <span className="text-xs font-black">{formatCurrency(suggestion)}</span>
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
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 mt-8">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl px-10 h-12 font-black text-base gap-2 shadow-xl shadow-primary/20">
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