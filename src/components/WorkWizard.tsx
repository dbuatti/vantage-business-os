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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wand2, 
  Briefcase, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Layers,
  Calendar,
  ChevronRight,
  List
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

interface SuggestionGroup {
  normalizedDescription: string;
  displayDescription: string;
  transactions: Transaction[];
  reason: string;
  totalAmount: number;
}

interface WorkWizardProps {
  transactions: Transaction[];
  onComplete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WORK_KEYWORDS = [
  { word: 'moises', reason: 'AI Music Tools' },
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
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Helper to strip unique IDs, dates, and card numbers from descriptions
  const normalizeDescription = (desc: string) => {
    return desc
      .toLowerCase()
      // Remove dates like "14 Feb 2026"
      .replace(/\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s\d{4}/gi, '')
      // Remove receipt numbers
      .replace(/receipt\s\d+/gi, '')
      // Remove card numbers like "420274xxxxxx8765"
      .replace(/\d{4}x+\d{4}/gi, '')
      // Remove foreign currency amounts
      .replace(/foreign currency amount: \d+/gi, '')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  const suggestionGroups = useMemo(() => {
    const groups: Record<string, SuggestionGroup> = {};

    transactions
      .filter(t => !t.is_work)
      .forEach(t => {
        const normalized = normalizeDescription(t.description);
        const match = WORK_KEYWORDS.find(k => normalized.includes(k.word) || (t.category_1 || '').toLowerCase().includes(k.word));
        
        if (match) {
          if (!groups[normalized]) {
            groups[normalized] = {
              normalizedDescription: normalized,
              displayDescription: t.description.split('-')[0].trim(), // Use first part for cleaner display
              transactions: [],
              reason: match.reason,
              totalAmount: 0
            };
          }
          groups[normalized].transactions.push(t);
          groups[normalized].totalAmount += t.amount;
        }
      });

    return Object.values(groups).sort((a, b) => b.transactions.length - a.transactions.length);
  }, [transactions, open]);

  const currentGroup = suggestionGroups[currentIndex];
  const progress = suggestionGroups.length > 0 ? ((currentIndex) / suggestionGroups.length) * 100 : 0;

  const handleMoveToWork = async () => {
    if (!currentGroup) return;
    setIsProcessing(true);
    try {
      const ids = currentGroup.transactions.map(t => t.id).filter(Boolean) as string[];
      
      const { error } = await supabase
        .from('finance_transactions')
        .update({ is_work: true })
        .in('id', ids);
      
      if (error) throw error;
      
      showSuccess(`Moved ${ids.length} transactions to Work`);
      
      if (currentIndex < suggestionGroups.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAllTransactions(false);
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
    if (currentIndex < suggestionGroups.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowAllTransactions(false);
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

  if (suggestionGroups.length === 0 && open) {
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
                  Reviewing {suggestionGroups.length} groups of potential work items
                </DialogDescription>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 bg-background/50 backdrop-blur-sm">
                {currentIndex + 1} of {suggestionGroups.length}
              </Badge>
            </div>
            <Progress value={progress} className="h-1.5 mt-4" />
          </DialogHeader>

          {currentGroup && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Group Card */}
              <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <button 
                      onClick={() => setShowAllTransactions(!showAllTransactions)}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                    >
                      <Layers className="w-3 h-3" />
                      {currentGroup.transactions.length} Similar Transactions
                      <ChevronRight className={cn("w-3 h-3 transition-transform", showAllTransactions && "rotate-90")} />
                    </button>
                    <h3 className="font-bold text-lg leading-tight">{currentGroup.displayDescription}</h3>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-xl font-black tabular-nums",
                      currentGroup.totalAmount > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {formatCurrency(currentGroup.totalAmount)}
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Group Value</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-lg font-medium">
                    {currentGroup.transactions[0].category_1 || 'Uncategorized'}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Suggestion: {currentGroup.reason}
                  </div>
                </div>

                {/* Transaction List View */}
                {showAllTransactions ? (
                  <div className="pt-2 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Transaction List:</p>
                      <Button variant="ghost" size="sm" onClick={() => setShowAllTransactions(false)} className="h-6 text-[10px] rounded-md">
                        Hide List
                      </Button>
                    </div>
                    <ScrollArea className="h-48 rounded-xl border bg-muted/30 p-2">
                      <div className="space-y-1.5">
                        {currentGroup.transactions.map((t, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background border text-[11px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-muted-foreground whitespace-nowrap">{format(new Date(t.transaction_date), 'MMM dd, yy')}</span>
                              <span className="font-medium truncate" title={t.description}>{t.description}</span>
                            </div>
                            <span className={cn(
                              "font-bold tabular-nums ml-2",
                              t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  /* Mini Timeline (Default View) */
                  <div className="pt-2 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent occurrences:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentGroup.transactions.slice(0, 6).map((t, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-[10px] font-medium">
                          <Calendar className="w-2.5 h-2.5 opacity-50" />
                          {format(new Date(t.transaction_date), 'MMM dd, yy')}
                        </div>
                      ))}
                      {currentGroup.transactions.length > 6 && (
                        <button 
                          onClick={() => setShowAllTransactions(true)}
                          className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                        >
                          +{currentGroup.transactions.length - 6} more
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
                  Move All to Work
                </Button>
              </div>

              <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Tip: This will update all {currentGroup.transactions.length} transactions at once
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkWizard;