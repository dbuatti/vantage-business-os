"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceEntry, AccountType } from '@/types/finance';
import { format, startOfMonth, subDays } from 'date-fns';
import { PlusCircle, Copy, Keyboard, Sparkles } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface FinanceFormProps {
  onAddEntry: (entry: FinanceEntry) => void;
  lastEntry?: FinanceEntry;
}

const FinanceForm = ({ onAddEntry, lastEntry }: FinanceFormProps) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [account, setAccount] = useState<AccountType>(() => {
    const saved = localStorage.getItem('lastAccount');
    return (saved as AccountType) || 'Savings';
  });
  const [amount, setAmount] = useState('');
  const [creditWas, setCreditWas] = useState('');
  const [justSubmitted, setJustSubmitted] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const creditWasRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('lastAccount', account);
  }, [account]);

  useEffect(() => {
    if (account === 'Credit') {
      creditWasRef.current?.focus();
    } else {
      amountRef.current?.focus();
    }
  }, [account]);

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
    setAmount('');
    setCreditWas('');
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 1500);
    showSuccess(`${account} entry added for ${date}`);
    
    setTimeout(() => {
      if (account === 'Credit') {
        creditWasRef.current?.focus();
      } else {
        amountRef.current?.focus();
      }
    }, 100);
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
    <Card className="w-full bg-card/80 backdrop-blur-sm border shadow-xl animate-slide-up opacity-0 stagger-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <PlusCircle className="w-5 h-5 text-primary" />
            </div>
            Log Weekly Entry
          </CardTitle>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <Keyboard className="w-3 h-3" />
            <span>⌘+Enter</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
              <div className="flex flex-wrap gap-1">
                {quickDates.map(({ label, days }) => (
                  <button
                    key={days}
                    type="button"
                    className="h-6 text-xs px-2.5 rounded-full text-primary hover:bg-primary/10 transition-colors font-medium"
                    onClick={() => setDate(format(subDays(new Date(), days), 'yyyy-MM-dd'))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</Label>
              <Select value={account} onValueChange={(val) => setAccount(val as AccountType)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Savings
                    </span>
                  </SelectItem>
                  <SelectItem value="Credit">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Credit
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {account === 'Credit' && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="creditWas" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Was ($)</Label>
                <Input 
                  ref={creditWasRef}
                  id="creditWas" 
                  type="number" 
                  step="0.01"
                  placeholder="-262.00"
                  value={creditWas} 
                  onChange={(e) => setCreditWas(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount ($)</Label>
              <Input 
                ref={amountRef}
                id="amount" 
                type="number" 
                step="0.01"
                placeholder="12,970.67"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                required
                className="h-11 rounded-xl text-lg font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button 
              type="submit" 
              className={cn(
                "h-11 rounded-xl font-semibold transition-all duration-300 flex-1",
                justSubmitted 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {justSubmitted ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Added!
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Entry
                </>
              )}
            </Button>
            {lastEntry && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCopyLast}
                className="h-11 rounded-xl font-medium"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Last
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FinanceForm;