"use client";

import React, { useState, useEffect } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceTable from '@/components/FinanceTable';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import ExportButton from '@/components/ExportButton';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchEntries();
    }
  }, [session, authLoading, navigate]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*')
        .order('date', { ascending: false });

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
      showSuccess('Entry added successfully!');
    } catch (error: any) {
      showError(error.message);
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
      showSuccess('Entry updated successfully!');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('finance_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEntries(prev => prev.filter(e => e.id !== id));
      showSuccess('Entry deleted successfully!');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

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

  const lastEntry = entries[0];

  if (authLoading || (session && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                <PiggyBank className="w-8 h-8" />
              </div>
              Weekly Finance Log
            </h1>
            <p className="text-indigo-600/70 font-medium mt-1">
              Logged in as {session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton entries={calculatedEntries} />
            <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2 border-indigo-100 hover:bg-indigo-50 text-indigo-600">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <FinanceSummary entries={calculatedEntries} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinanceForm onAddEntry={addEntry} lastEntry={lastEntry} />
          <FinanceChart entries={calculatedEntries} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-indigo-900 px-1">History</h2>
          <FinanceTable 
            entries={calculatedEntries} 
            onDeleteEntry={deleteEntry}
            onUpdateEntry={updateEntry}
          />
        </div>

        <footer className="pt-12">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Index;