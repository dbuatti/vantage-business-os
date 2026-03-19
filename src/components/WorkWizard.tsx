"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Wand2, 
  Briefcase, 
  User, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { showSuccess, showError } from '@/utils/toast';

interface Transaction {
  id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  is_work: boolean;
}

interface WorkWizardProps {
  transactions: Transaction[];
  onComplete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORK_KEYWORDS = [
  { word: 'salary', reason: 'Likely regular income' },
  { word: 'teaching', reason: 'Education services' },
  { word: 'aim', reason: 'Institutional income' },
  { word: 'carey', reason: 'Institutional income' },
  { word: 'vca', reason: 'Institutional income' },
  { word: 'vcass', reason: 'Institutional income' },
  { word: 'gig', reason: 'Performance related' },
  { word: 'wedding', reason: 'Performance related' },
  { word: 'choir', reason: 'Performance related' },
  { word: 'audition', reason: 'Professional activity' },
  { word: 'rehearsal', reason: 'Professional activity' },
  { word: 'corporate', reason: 'Business client' },
  { word: 'ministry', reason: 'Service income' },
  { word: 'piano', reason: 'Music equipment/service' },
  { word: 'ameb', reason: 'Exam/Education' },
  { word: 'exam', reason: 'Exam/Education' },
  { word: 'arranging', reason: 'Creative services' },
  { word: 'repair', reason: 'Equipment maintenance' },
  { word: 'subscription', reason: 'Business software/service' },
  { word: 'software', reason: 'Business tool' },
  { word: 'apple', reason: 'Technology/Software' },
  { word: 'music', reason: 'Professional materials' },
  { word: 'sheet', reason: 'Professional materials' },
  { word: 'business', reason: 'Direct business expense' },
  { word: 'musician', reason: 'Contractor payment' },
  { word: 'accountant', reason: 'Professional services' },
  { word: 'printing', reason: 'Office expense' },
  { word: 'parking', reason: 'Travel related' },
  { word: 'toll', reason: 'Travel related' },
  { word: 'fuel', reason: 'Travel related' },
];

const WorkWizard = ({ transactions, onComplete, open, onOpenChange }: WorkWizardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const suggestions = useMemo(() => {
    return transactions
      .filter(t => !t.is_work)
      .map(t => {
        const desc = t.description.toLowerCase();
        const cat = (t.category_1 || '').toLowerCase();
        const match = WORK_KEYWORDS.find(k => desc.includes(k.word) || cat.includes(k.word));
        
        if (match) {
          return { ...t, suggestionReason: match.reason, keyword: match.word };
        }
        return null;
      })
      .filter(Boolean) as Array<Transaction & { suggestionReason: string; keyword: string }>;
  }, [transactions, open]);

  const currentSuggestion = suggestions[currentIndex];
  const progress = suggestions.length > 0 ? ((currentIndex) / suggestions.length) * 100 : 0;

  const handleMoveToWork = async () => {
    if (!currentSuggestion || !currentSuggestion.id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('finance_transactions')
        .update({ is_work: true })
        .eq('id', currentSuggestion.id);
      
      if (error) throw error;
      
      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        showSuccess('Wizard complete!');
        onComplete();
        onOpenChange(false);
      }
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
      onOpenChange(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  if (suggestions.length === 0 && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Work Category Wizard
            </DialogTitle>
          </DialogHeader>
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-lg">All caught up!</p>
              <p className="text-sm text-muted-foreground">No personal transactions look like work items right now.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  Work Category Wizard
                </DialogTitle>
                <DialogDescription>
                  Reviewing {suggestions.length} potential work items
                </DialogDescription>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 bg-background/50 backdrop-blur-sm">
                {currentIndex + 1} of {suggestions.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-1.5 mt-4" />
          </DialogHeader>

          {currentSuggestion && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Transaction Card */}
              <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {format(new Date(currentSuggestion.transaction_date), 'MMMM dd, yyyy')}
                    </p>
                    <h3 className="font-bold text-lg leading-tight">{currentSuggestion.description}</h3>
                  </div>
                  <div className={cn(
                    "text-xl font-black tabular-nums",
                    currentSuggestion.amount > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCurrency(currentSuggestion.amount)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-lg font-medium">
                    {currentSuggestion.category_1 || 'Uncategorized'}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Suggestion: {currentSuggestion.suggestionReason}
                  </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  className="h-14 rounded-2xl border-2 hover:bg-muted/50 group"
                  disabled={isProcessing}
                >
                  <User className="w-4 h-4 mr-2 text-muted-foreground group-hover:scale-110 transition-transform" />
                  Keep Personal
                </Button>
                <Button 
                  onClick={handleMoveToWork}
                  className="h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group"
                  disabled={isProcessing}
                >
                  <Briefcase className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Move to Work
                </Button>
              </div>

              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Tip: You can always change this later in the transaction list
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkWizard;