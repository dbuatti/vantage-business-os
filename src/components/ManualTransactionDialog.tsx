"use client";

import React, { useState } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, DollarSign, Calendar as CalendarIcon, Music, Sparkles, HelpCircle } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { BusinessStreamSelector } from './BusinessStreamSelector';

interface ManualTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: string[];
  subcategories: string[];
}

const ManualTransactionDialog = ({ open, onOpenChange, onSuccess, categories, subcategories }: ManualTransactionDialogProps) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    category_1: 'Other',
    category_2: '',
    is_work: false,
    notes: '',
    account_label: 'Manual Entry',
    business_stream: 'Other' as 'Music' | 'Kinesiology' | 'Other'
  });

  const handleSave = async () => {
    if (!session || !form.description || !form.amount) return;
    
    setLoading(true);
    try {
      const amount = parseFloat(form.amount);
      const date = new Date(form.transaction_date);
      
      const { error } = await supabase
        .from('finance_transactions')
        .insert([{
          user_id: session.user.id,
          transaction_date: form.transaction_date,
          description: form.description,
          amount: amount,
          category_1: form.category_1,
          category_2: form.category_2 === 'none' ? '' : form.category_2,
          is_work: form.is_work,
          is_reviewed: true, // Manual entries are considered reviewed
          notes: form.notes,
          account_label: form.account_label,
          mmm_yyyy: format(date, 'MMM yyyy'),
          month_name: format(date, 'MMMM'),
          month_code: format(date, 'MM'),
          week: Math.ceil(date.getDate() / 7),
          business_stream: form.business_stream
        }]);

      if (error) throw error;
      
      showSuccess('Transaction added manually');
      onSuccess();
      onOpenChange(false);
      setForm({
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        category_1: 'Other',
        category_2: '',
        is_work: false,
        notes: '',
        account_label: 'Manual Entry',
        business_stream: 'Other'
      });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            Add Transaction
          </DialogTitle>
          <DialogDescription>
            Manually log an expense or income item.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input 
                type="date" 
                value={form.transaction_date} 
                onChange={(e) => setForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  value={form.amount} 
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="pl-9 rounded-xl font-bold"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Use negative for expenses</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              placeholder="e.g. Coffee, Office Supplies, Gig Payment" 
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category_1} onValueChange={(v) => setForm(prev => ({ ...prev, category_1: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select value={form.category_2} onValueChange={(v) => setForm(prev => ({ ...prev, category_2: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subcategories.map(sub => (
                    <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account Label</Label>
            <Input
              value={form.account_label}
              onChange={(e) => setForm(prev => ({ ...prev, account_label: e.target.value }))}
              className="rounded-xl"
            />
          </div>

          <BusinessStreamSelector
            value={form.business_stream}
            onChange={(v) => setForm(prev => ({ ...prev, business_stream: v }))}
          />

          <div className="flex items-center gap-2 pt-2">
            <Checkbox 
              id="manual_is_work" 
              checked={form.is_work} 
              onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_work: !!checked }))} 
            />
            <Label htmlFor="manual_is_work" className="font-normal">Work-related transaction</Label>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              placeholder="Optional details..." 
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !form.description || !form.amount} className="rounded-xl px-8">
            {loading ? 'Saving...' : 'Save Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManualTransactionDialog;