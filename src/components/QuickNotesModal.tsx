"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  CheckCircle2, 
  Keyboard, 
  Sparkles, 
  Loader2, 
  Save,
  ArrowRight,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface QuickNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: any[];
  onSuccess: () => void;
}

const QuickNotesModal = ({ open, onOpenChange, transactions, onSuccess }: QuickNotesModalProps) => {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Smart Pre-fill Logic
  const getSuggestion = (t: any) => {
    const desc = t.description.toLowerCase();
    const cat = (t.category_1 || '').toLowerCase();
    const account = (t.account_label || '').toLowerCase();

    // High School Logic
    if (
      desc.includes('carey baptist') || 
      desc.includes('john paul college') || 
      desc.includes('careygramm') ||
      cat.includes('carey')
    ) {
      return 'Teaching / Performance / Accompaniment at high school';
    }

    // VCASS Logic
    if (cat.includes('vcass') || desc.includes('victorian co')) {
      return 'VCASS Teaching Work';
    }

    // Ministry of Dance Logic
    if (desc.includes('matthew godbold') || cat.includes('ministry')) {
      return 'MINISTRY OF DANCE Teaching Work';
    }

    // Square specific logic
    if (
      desc.includes('square australia') || 
      desc.includes('square au pty lt') || 
      account.includes('square')
    ) {
      return 'Internal teaching work';
    }

    // Music Industry Logic
    if (desc.includes('walt di') || desc.includes('mermaid')) return 'Musical Theatre / Gig Income';
    if (desc.includes('opera')) return 'Opera Performance Income';
    
    // AMEB Specific Logic
    if (desc.includes('ameb') || cat.includes('ameb')) return 'AMEB Accompaniment Exams';
    
    // AMTC Logic
    if (desc.includes('amtc') || desc.includes('bertram robert andrew')) return 'AMTC Choir Work';
    
    // General Exam Logic
    if (desc.includes('exam')) return 'Exam Accompaniment';
    
    if (desc.includes('vocal coaching') || desc.includes('lesson')) return 'Private Teaching Income';

    // Subscription Logic
    if (desc.includes('notion labs')) return 'Notion subscription for business organization and project management';

    // General Expense Logic
    if (cat.includes('fuel')) return 'Fuel / Travel';
    if (['utilities', 'bills', 'electricity', 'gas', 'internet'].some(k => cat.includes(k) || desc.includes(k))) return 'Utilities';
    
    return '';
  };

  const itemsWithSuggestions = useMemo(() => {
    return transactions.filter(t => !!getSuggestion(t));
  }, [transactions]);

  const handleApplyAllSuggestions = () => {
    const newNotes = { ...notes };
    itemsWithSuggestions.forEach(t => {
      if (!newNotes[t.id]) {
        newNotes[t.id] = getSuggestion(t);
      }
    });
    setNotes(newNotes);
    showSuccess(`Applied ${itemsWithSuggestions.length} smart suggestions`);
  };

  const handleSave = async () => {
    const updates = Object.entries(notes)
      .filter(([_, note]) => note.trim() !== '')
      .map(([id, note]) => ({ id, notes: note }));

    if (updates.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      for (const update of updates) {
        await supabase
          .from('finance_transactions')
          .update({ notes: update.notes })
          .eq('id', update.id);
      }
      showSuccess(`Saved ${updates.length} notes`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextId = transactions[index + 1]?.id;
      if (nextId) {
        inputRefs.current[nextId]?.focus();
      } else {
        handleSave();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl rounded-3xl p-0 overflow-hidden border-0 shadow-2xl h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 shrink-0 border-b">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                  <Zap className="w-6 h-6 text-primary" />
                  Power Note Entry
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Quickly add notes to {transactions.length} transactions. Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Tab</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to move fast.
                </DialogDescription>
              </div>
              {itemsWithSuggestions.length > 0 && (
                <Button 
                  onClick={handleApplyAllSuggestions}
                  variant="outline"
                  className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5 font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  Apply {itemsWithSuggestions.length} Suggestions
                </Button>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="space-y-4">
            {transactions.map((t, index) => {
              const suggestion = getSuggestion(t);
              return (
                <div key={t.id} className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 rounded-2xl bg-card border hover:border-primary/30 transition-all shadow-sm">
                  <div className="md:col-span-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">{format(new Date(t.transaction_date), 'MMM dd, yyyy')}</p>
                    <Badge variant="outline" className="mt-1 text-[9px] font-bold uppercase tracking-tighter">{t.category_1}</Badge>
                  </div>
                  
                  <div className="md:col-span-4 min-w-0">
                    <p className="font-bold text-sm truncate" title={t.description}>{t.description}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{t.account_label}</p>
                  </div>

                  <div className="md:col-span-2 text-right">
                    <p className={cn("font-black text-sm tabular-nums", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                      {formatCurrency(t.amount)}
                    </p>
                  </div>

                  <div className="md:col-span-4 space-y-2">
                    <div className="relative">
                      <Input 
                        ref={el => { inputRefs.current[t.id] = el; }}
                        placeholder={suggestion ? `Suggestion: ${suggestion}` : "Add note..."}
                        value={notes[t.id] || ''}
                        onChange={(e) => setNotes(prev => ({ ...prev, [t.id]: e.target.value }))}
                        onKeyDown={(e) => handleKeyDown(e, t.id, index)}
                        className="rounded-xl h-10 bg-muted/30 border-transparent focus:bg-background focus:border-primary/30 transition-all font-medium text-sm"
                      />
                      {suggestion && !notes[t.id] && (
                        <button 
                          onClick={() => setNotes(prev => ({ ...prev, [t.id]: suggestion }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Apply suggestion"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t bg-muted/10 shrink-0">
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving} 
              className="rounded-xl px-10 h-12 font-black text-base gap-2 shadow-xl shadow-primary/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Notes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickNotesModal;