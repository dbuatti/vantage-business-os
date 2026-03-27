"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceEntry, AccountType } from '@/types/finance';
import { format, startOfMonth, subDays } from 'date-fns';
import { PlusCircle, Copy, Keyboard, Sparkles, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface FinanceFormProps {
  onAddEntry: (entry: FinanceEntry) => void;
  lastEntry?: FinanceEntry;
}

const STORAGE_KEY = 'vantage_weekly_log_draft';

const FinanceForm = ({ onAddEntry, lastEntry }: FinanceFormProps) => {
  const [date, setDate] = useState(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_date`);
    return saved || format(new Date(), 'yyyy-MM-dd');
  });
  
  const [account, setAccount] = useState<AccountType>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_account`);
    return (saved as AccountType) || 'Savings';
  });
  
  const [amount, setAmount] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY}_amount`) || '';
  });
  
  const [creditWas, setCreditWas] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY}_creditWas`) || '';
  });

  const [justSubmitted, setJustSubmitted] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const creditWasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_date`, date);
    localStorage.setItem(`${STORAGE_KEY}_account`, account);
    localStorage.setItem(`${STORAGE_KEY}_amount`, amount);
    localStorage.setItem(`${STORAGE_KEY}_creditWas`, creditWas);
  }, [date, account, amount, creditWas]);

  useEffect(() => {
    if (account === 'Credit') {
      creditWasRef.current?.focus();
    } else {
      amountRef.current?.focus();
    }
  }, [account]);

  const clearDraft = () => {
    localStorage.removeItem(`${STORAGE_KEY}_amount`);
    localStorage.removeItem(`${STORAGE_KEY}_creditWas`);
    setAmount('');
    setCreditWas('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryDate = new Date(date);
    const monthYear = format(startOfMonth(entryDate), 'MM/yyyy');

    const newEntry: FinanceEntry = {
      id: crypto.randomUUID(),
      date,
      amount: parseFloat(amount) || 0,
      account,
      monthYear,
      ...(account === 'Credit' && { creditWas: parseFloat(creditWas) || 0 })
    };

    onAddEntry(newEntry);
    clearDraft();
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 1500);
  };

  const handleCopyLast = () => {
    if (!lastEntry) return;
    setAccount(lastEntry.account);
    setAmount(lastEntry.amount.toString());
    if (lastEntry.creditWas !== undefined) {
      setCreditWas(lastEntry.creditWas.toString());
    }
    showSuccess('Copied values from last entry');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) form.requestSubmit();
    }
  };

  const quickDates = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: '2 days ago', days: 2 },
    { label: 'Last week', days: 7 },
  ];

  return (
    <Card className="w-full bg-card/40 backdrop-blur-xl border shadow-2xl animate-slide-up overflow-hidden">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Log Weekly Entry</CardTitle>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Thursday Routine</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
            <Keyboard className="w-3.5 h-3.5" />
            <span>⌘ + Enter</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
          <div className="space-y-6">
            {/* Date Field */}
            <div className="space-y-3">
              <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Entry Date
              </Label>
              <div className="relative">
                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input 
                  id="date" 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="h-14 rounded-2xl pl-12 bg-muted/30 border-muted focus:bg-background transition-all font-bold text-base"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {quickDates.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    className={cn(
                      "h-8 text-[10px] px-4 rounded-full font-black uppercase tracking-tighter transition-all border",
                      format(subDays(new Date(), days), 'yyyy-MM-dd') === date
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                        : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={() => setDate(format(subDays(new Date(), days), 'yyyy-MM-dd'))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Field */}
            <div className="space-y-3">
              <Label htmlFor="account" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                Account Type
              </Label>
              <Select value={account} onValueChange={(val) => setAccount(val as AccountType)}>
                <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-muted focus:bg-background transition-all font-bold text-base">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-muted shadow-2xl">
                  <SelectItem value="Savings" className="rounded-xl">
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <span className="font-bold">Savings Account</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Credit" className="rounded-xl">
                    <div className="flex items-center gap-2 py-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <span className="font-bold">Credit Card</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Credit Was Field (Conditional) */}
              {account === 'Credit' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                  <Label htmlFor="creditWas" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    Previous Balance ($)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      ref={creditWasRef}
                      id="creditWas" 
                      type="number" 
                      step="0.01"
                      placeholder="-262.00"
                      value={creditWas} 
                      onChange={(e) => setCreditWas(e.target.value)}
                      required
                      className="h-14 rounded-2xl pl-12 bg-muted/30 border-muted focus:bg-background transition-all font-bold text-lg text-rose-600"
                    />
                  </div>
                </div>
              )}

              {/* Amount Field */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                  Current Balance ($)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    ref={amountRef}
                    id="amount" 
                    type="number" 
                    step="0.01"
                    placeholder="12,970.67"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="h-14 rounded-2xl pl-12 bg-muted/30 border-muted focus:bg-background transition-all text-xl font-black tracking-tight"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              type="submit" 
              className={cn(
                "h-16 rounded-2xl font-black text-lg transition-all duration-500 shadow-xl",
                justSubmitted 
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" 
                  : "bg-primary hover:bg-primary/90 shadow-primary/20"
              )}
              disabled={!amount || (account === 'Credit' && !creditWas)}
            >
              {justSubmitted ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                  Snapshot Recorded!
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Add Weekly Entry
                </>
              )}
            </Button>
            {lastEntry && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCopyLast}
                className="h-14 rounded-2xl font-bold border-2 hover:bg-muted/50 transition-all gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Last Entry
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FinanceForm;