"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { showError, showSuccess } from '@/utils/toast';
import FinanceForm from '@/components/FinanceForm';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import MonthlySummary from '@/components/MonthlySummary';
import { SummarySkeleton, FormSkeleton } from '@/components/LoadingSkeleton';
import { CalendarCheck, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";

const WeeklyLog = () => {
  const { session } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchEntries();
  }, [session]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);

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
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error: any) {
      showError(error.message);
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <SummarySkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <CalendarCheck className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Weekly Routine</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Thursday Snapshot</h1>
          <p className="text-muted-foreground">Log your savings and debt to track your true financial progress.</p>
        </div>
        <Button variant="outline" asChild className="rounded-xl">
          <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard</Link>
        </Button>
      </header>

      <FinanceSummary entries={calculatedEntries} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <FinanceForm onAddEntry={addEntry} lastEntry={entries[0]} />
          
          <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Info className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">Why do this?</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              By recording your balances every Thursday, you create a high-fidelity map of your wealth. 
              This helps you spot if you're "behind" on credit card payments before they become a problem.
            </p>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-8">
          <FinanceChart entries={calculatedEntries} />
          <MonthlySummary entries={calculatedEntries} />
        </div>
      </div>

      <footer className="pt-12 pb-6">
        <MadeWithDyad />
      </footer>
    </div>
  );
};

export default WeeklyLog;