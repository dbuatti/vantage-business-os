"use client";

import React, { useState, useEffect } from 'react';
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
import { Target, Save, Loader2, Plus, Trash2 } from 'lucide-react';

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
  const [formBudgets, setFormBudgets] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      // Initialize with existing budgets or empty defaults for groups
      const initial = GROUPS.map(group => {
        const existing = existingBudgets.find(b => b.category_name === group && !b.month);
        return {
          category_name: group,
          amount: existing?.amount || 0,
          isGroup: true
        };
      });
      setFormBudgets(initial);
    }
  }, [open, existingBudgets]);

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

  const updateAmount = (index: number, val: string) => {
    const next = [...formBudgets];
    next[index].amount = val;
    setFormBudgets(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Set Yearly Budgets ({year})
          </DialogTitle>
          <DialogDescription>
            Define your spending targets for the main expense buckets.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {formBudgets.map((budget, i) => (
              <div key={budget.category_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                    {budget.category_name}
                  </Label>
                  <span className="text-[10px] font-bold text-muted-foreground">Yearly Target</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    value={budget.amount} 
                    onChange={(e) => updateAmount(i, e.target.value)}
                    className="h-12 pl-8 rounded-xl font-black text-lg"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  ~{formatCurrency((parseFloat(budget.amount) || 0) / 12)} per month
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-xl px-8 gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Budgets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetDialog;