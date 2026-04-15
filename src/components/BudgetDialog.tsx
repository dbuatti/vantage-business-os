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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Target, Save, Loader2, Sparkles, Wand2, History } from 'lucide-react';
import { startOfYear, endOfYear, format, subYears } from 'date-fns';

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
  const [suggestions, setSuggestions] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) {
      const initial = GROUPS.map(group => {
        const existing = existingBudgets.find(b => b.category_name === group && !b.month);
        return {
          category_name: group,
          amount: existing?.amount || 0,
          isGroup: true
        };
      });
      setFormBudgets(initial);
      fetchSuggestions();
    }
  }, [open, existingBudgets]);

  const fetchSuggestions = async () => {
    if (!session) return;
    setAnalyzing(true);
    try {
      // Fetch last 12 months of transactions to get a good average
      const oneYearAgo = format(subYears(new Date(), 1), 'yyyy-MM-dd');
      
      const [txnsRes, groupsRes] = await Promise.all([
        supabase
          .from('finance_transactions')
          .select('amount, category_1, transaction_date')
          .lt('amount', 0)
          .gte('transaction_date', oneYearAgo),
        supabase.from('category_groups').select('*')
      ]);

      if (txnsRes.error) throw txnsRes.error;

      const catToGroup: Record<string, string> = {};
      groupsRes.data?.forEach(cg => { catToGroup[cg.category_name] = cg.group_name; });

      const groupTotals: Record<string, number> = {};
      GROUPS.forEach(g => groupTotals[g] = 0);

      txnsRes.data?.forEach(t => {
        const group = catToGroup[t.category_1];
        if (group && groupTotals[group] !== undefined) {
          groupTotals[group] += Math.abs(t.amount);
        }
      });

      // Calculate monthly average and multiply by 12 for yearly suggestion
      // We divide by 12 or the number of months since the first transaction in the set
      const suggested: Record<string, number> = {};
      GROUPS.forEach(g => {
        suggested[g] = Math.round(groupTotals[g]); // This is already a "year-ish" total if we fetched 12 months
      });

      setSuggestions(suggested);
    } catch (error) {
      console.error("Error fetching budget suggestions:", error);
    } finally {
      setAnalyzing(false);
    }
  };

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
    const val = suggestions[groupName];
    if (val === undefined) return;
    
    const next = [...formBudgets];
    const idx = next.findIndex(b => b.category_name === groupName);
    if (idx !== -1) {
      next[idx].amount = val.toString();
      setFormBudgets(next);
      showSuccess(`Applied suggestion for ${groupName}`);
    }
  };

  const applyAllSuggestions = () => {
    const next = formBudgets.map(b => ({
      ...b,
      amount: (suggestions[b.category_name] || b.amount).toString()
    }));
    setFormBudgets(next);
    showSuccess('Applied all historical suggestions');
  };

  const updateAmount = (index: number, val: string) => {
    const next = [...formBudgets];
    next[index].amount = val;
    setFormBudgets(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Target className="w-5 h-5 text-primary" />
                  Set Yearly Budgets ({year})
                </DialogTitle>
                <DialogDescription>
                  Define your spending targets for the main expense buckets.
                </DialogDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={applyAllSuggestions}
                disabled={analyzing || Object.keys(suggestions).length === 0}
                className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5"
              >
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Auto-Fill All
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
            <div className="space-y-6 py-2">
              {formBudgets.map((budget, i) => (
                <div key={budget.category_name} className="space-y-3 p-4 rounded-2xl bg-card border shadow-sm group hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between">
                    <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      {budget.category_name}
                    </Label>
                    {suggestions[budget.category_name] > 0 && (
                      <button 
                        onClick={() => applySuggestion(budget.category_name)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:opacity-80 transition-opacity"
                      >
                        <History className="w-3 h-3" />
                        Suggest: {formatCurrency(suggestions[budget.category_name])}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      value={budget.amount} 
                      onChange={(e) => updateAmount(i, e.target.value)}
                      className="h-14 pl-8 rounded-xl font-black text-xl bg-muted/30 border-transparent focus:bg-background focus:border-primary/30 transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] text-muted-foreground font-medium italic">
                      ~{formatCurrency((parseFloat(budget.amount) || 0) / 12)} per month
                    </p>
                    {parseFloat(budget.amount) > 0 && suggestions[budget.category_name] > 0 && (
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        parseFloat(budget.amount) >= suggestions[budget.category_name] ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {parseFloat(budget.amount) >= suggestions[budget.category_name] ? 'Realistic' : 'Aggressive'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 mt-8">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-xl px-10 h-12 font-black text-base gap-2 shadow-xl shadow-primary/20">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Budgets
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetDialog;