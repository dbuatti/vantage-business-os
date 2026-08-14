"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { showError, showSuccess } from '@/utils/toast';
import FinanceForm from '@/components/FinanceForm';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import MonthlySummary from '@/components/MonthlySummary';
import FinanceTable from '@/components/FinanceTable';
import { SummarySkeleton, FormSkeleton } from '@/components/LoadingSkeleton';
import { CalendarCheck, Info, Sparkles, ShieldCheck, TrendingUp, TrendingDown, History, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { cn } from '@/lib/utils';

const WeeklyLog = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('finance_entries')
        .select('*')
        .order('date', { ascending: false });

      if (selectedYear !== 'All') {
        query = query.gte('date', `${selectedYear}-01-01`).lte('date', `${selectedYear}-12-31`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      const mappedData = (data || []).map(item => ({
        id: item.id,
        date: item.date,
        creditWas: item.credit_was,
        amount: item.amount,
        account: item.account,
        monthYear: item.month_year
      }));
      
      setEntries(mappedData);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (session) fetchEntries();
  }, [session, selectedYear, fetchEntries]);

  const addEntry = async (entry: FinanceEntry) => {
    if (!session) return;
    try {
      const { error } = await supabase
        .from('finance_entries')
        .insert([{
          date: entry.date,
          credit_was: entry.creditWas,
          amount: entry.amount,
          account: entry.account,
          month_year: entry.monthYear,
          user_id: session.user.id
        }]);

      if (error) throw error;
      fetchEntries();
      showSuccess('Weekly snapshot recorded!');
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEntries();
      showSuccess('Entry deleted');
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const updateEntry = async (id: string, updates: { amount: number; creditWas?: number }) => {
    try {
      const { error } = await supabase
        .from('finance_entries')
        .update({
          amount: updates.amount,
          credit_was: updates.creditWas
        })
        .eq('id', id);

      if (error) throw error;
      fetchEntries();
      showSuccess('Entry updated');
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const calculatedEntries: CalculatedEntry[] = useMemo(() => {
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((entry, index, allEntries) => {
        const previousEntry = allEntries.slice(index + 1).find(e => e.account === entry.account);
        let difference = 0;
        if (previousEntry) {
          difference = entry.amount - previousEntry.amount;
        } else if (entry.account === 'Credit' && entry.creditWas !== undefined) {
          difference = entry.amount - entry.creditWas;
        }
        return { ...entry, difference };
      });
  }, [entries]);

  if (loading) {
    return (
      <div className="w-full p-4 sm:p-6 lg:p-8 space-y-8">
        <SummarySkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-10 from-background to-muted/20 bg-gradient-to-b">
        {/* Immersive Header */}
        <header className="relative py-8 px-6 rounded-[2.5rem] bg-primary overflow-hidden shadow-xl shadow-primary/20 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-purple-700" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:32px_32px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <span className="text-xs font-semibold opacity-70">Routine Mode</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter">Thursday Snapshot</h1>
              <p className="text-white/70 text-lg font-medium max-w-xl">
                Log your savings and debt to map your true financial progress.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <p className="text-xs font-semibold opacity-70">Current Year</p>
                <p className="text-xl font-black">{selectedYear}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Summary Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Financial Health</h2>
          </div>
          <FinanceSummary entries={calculatedEntries} />
          {(() => {
            const creditEntries = calculatedEntries.filter(e => e.account === 'Credit');
            const latestCredit = creditEntries[0];
            const prevCredit = creditEntries[1];
            if (!latestCredit || latestCredit.amount === 0) return null;
            const creditChange = prevCredit ? latestCredit.amount - prevCredit.amount : 0;
            return (
              <Card className="border-0 shadow-md bg-warning-bg">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-warning-bg text-warning">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Credit Card Debt</p>
                      <p className="text-xs text-muted-foreground">
                        {creditEntries.length} entries tracked · Last entry: {format(new Date(latestCredit.date), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">{formatCurrency(latestCredit.amount)}</p>
                    {prevCredit && (
                      <p className={cn(
                        "text-xs font-bold flex items-center gap-1 justify-end",
                        creditChange > 0 ? "text-danger" : "text-profit"
                      )}>
                        {creditChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {creditChange > 0 ? '+' : ''}{formatCurrency(creditChange)} since last entry
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Entry Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24">
              <FinanceForm onAddEntry={addEntry} lastEntry={entries[0]} />
              
              <Card className="mt-6 border-0 shadow-sm bg-info text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                <CardContent className="p-6 relative space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold opacity-70">Why this matters</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed opacity-90">
                    Recording your balances every Thursday creates a high-fidelity map of your wealth. 
                    It helps you spot if you're "behind" on credit card payments before they become a problem.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Right Column: Charts & History */}
          <div className="lg:col-span-8 space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Progress Chart</h2>
              </div>
              <FinanceChart entries={calculatedEntries} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Monthly History</h2>
              </div>
              <MonthlySummary entries={calculatedEntries} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Detailed History</h2>
              </div>
              <FinanceTable 
                entries={calculatedEntries} 
                onDeleteEntry={deleteEntry} 
                onUpdateEntry={updateEntry} 
              />
            </div>
          </div>
        </div>

        <footer className="pt-12 pb-6">
          <MadeWithDyad />
        </footer>
      </div>
  );
};

export default WeeklyLog;