"use client";

import React, { useState, useEffect } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceTable from '@/components/FinanceTable';
import FinanceSummary from '@/components/FinanceSummary';
import Auth from '@/components/Auth';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { showError } from '@/utils/toast';

const Index = () => {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchEntries();
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchEntries();
      else {
        setEntries([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Map snake_case from DB to camelCase for the app
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
      fetchEntries(); // Refresh list
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Calculate differences based on previous entries of the same account type
  const calculatedEntries: CalculatedEntry[] = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((entry, index, allEntries) => {
      const previousEntry = allEntries.slice(index + 1).find(e => e.account === entry.account);
      
      let difference = 0;
      if (previousEntry) {
        difference = entry.amount - previousEntry.amount;
      } else if (entry.account === 'Credit' && entry.creditWas !== undefined) {
        difference = entry.amount - entry.creditWas;
      }

      return {
        ...entry,
        difference
      };
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="text-center space-y-4">
            <h1 className="text-4xl font-black text-indigo-950 flex items-center justify-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <PiggyBank className="w-10 h-10" />
              </div>
              Weekly Finance Log
            </h1>
            <p className="text-indigo-600/70 font-medium text-lg">
              Securely track your savings and credit progress
            </p>
          </header>
          <Auth />
          <footer className="pt-12">
            <MadeWithDyad />
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <PiggyBank className="w-8 h-8" />
              </div>
              Weekly Finance Log
            </h1>
            <p className="text-indigo-600/70 font-medium mt-1">
              Logged in as {session.user.email}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </header>

        <FinanceSummary entries={calculatedEntries} />
        
        <FinanceForm onAddEntry={addEntry} />

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-indigo-900 px-1">History</h2>
          <FinanceTable entries={calculatedEntries} />
        </div>

        <footer className="pt-12">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Index;