"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { showError, showSuccess } from '@/utils/toast';
import FinanceForm from '@/components/FinanceForm';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import MonthlySummary from '@/components/MonthlySummary';
import { SummarySkeleton, FormSkeleton } from '@/components/LoadingSkeleton';
import { CalendarCheck, ArrowLeft, Info, Sparkles, ShieldCheck, TrendingUp, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { cn } from '@/lib/utils';

const WeeklyLog = () => {
  const { session } = useAuth();
  const { selectedYear } = useSettings();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchEntries();
  }, [session, selectedYear]);

  const fetchEntries = async () => {
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        {/* Immersive Header */}
        <header className="relative py-8 px-6 rounded-[2.5rem] bg-primary overflow-hidden shadow-2xl shadow-primary/20 animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-purple-700" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:32px_32px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <CalendarCheck className="w-7 h-7" />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Routine Mode</span>
              </div>
              <h1 className="text-4xl font-black tracking-tighter">Thursday Snapshot</h1>
              <p className="text-white/70 text-lg font-medium max-w-xl">
                Log your savings and debt to map your true financial progress.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
                <p className="text-[10px] font-black uppercase opacity-60">Current Year</p>
                <p className="text-xl font-black">{selectedYear}</p>
              </div>
              <Button variant="outline" asChild className="rounded-2xl bg-white/10 border-white/20 hover:bg-white/20 text-white font-bold h-12 px-6">
                <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Dashboard</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Summary Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Financial Health</h2>
          </div>
          <FinanceSummary entries={calculatedEntries} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Entry Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24">
              <div className="flex items-center gap-2 px-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">New Entry</h2>
              </div>
              <FinanceForm onAddEntry={addEntry} lastEntry={entries[0]} />
              
              <Card className="mt-6 border-0 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                <CardContent className="p-6 relative space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-80">Why this matters</span>
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
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Progress Chart</h2>
              </div>
              <FinanceChart entries={calculatedEntries} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Monthly History</h2>
              </div>
              <MonthlySummary entries={calculatedEntries} />
            </div>
          </div>
        </div>

        <footer className="pt-12 pb-6">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default WeeklyLog;