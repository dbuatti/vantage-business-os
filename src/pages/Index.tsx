"use client";

import React, { useState, useEffect, useMemo } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceTable from '@/components/FinanceTable';
import FinanceSummary from '@/components/FinanceSummary';
import FinanceChart from '@/components/FinanceChart';
import ExportButton from '@/components/ExportButton';
import QuickStats from '@/components/QuickStats';
import DateRangeFilter from '@/components/DateRangeFilter';
import MonthlySummary from '@/components/MonthlySummary';
import SortControl, { SortField, SortOrder } from '@/components/SortControl';
import ThemeToggle from '@/components/ThemeToggle';
import { SummarySkeleton, FormSkeleton, TableSkeleton } from '@/components/LoadingSkeleton';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank, LogOut, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { isWithinInterval, parseISO } from 'date-fns';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
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

  // Calculate entries with differences
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

        return {
          ...entry,
          difference
        };
      });
  }, [entries]);

  // Filter by date range
  const filteredEntries = useMemo(() => {
    if (!dateRange.from && !dateRange.to) return calculatedEntries;
    
    return calculatedEntries.filter(entry => {
      const entryDate = parseISO(entry.date);
      if (dateRange.from && dateRange.to) {
        return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
      }
      if (dateRange.from) {
        return entryDate >= dateRange.from;
      }
      if (dateRange.to) {
        return entryDate <= dateRange.to;
      }
      return true;
    });
  }, [calculatedEntries, dateRange]);

  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'account':
          comparison = a.account.localeCompare(b.account);
          break;
        case 'difference':
          comparison = a.difference - b.difference;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEntries, sortField, sortOrder]);

  const lastEntry = entries[0];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-gray-900">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-900 p-4 md:p-8 lg:p-12 transition-colors">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-indigo-950 dark:text-indigo-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900">
                <PiggyBank className="w-8 h-8" />
              </div>
              Weekly Finance Log
            </h1>
            <p className="text-indigo-600/70 dark:text-indigo-400 font-medium mt-1">
              Logged in as {session.user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <ExportButton entries={sortedEntries} />
            <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2 border-indigo-100 hover:bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:hover:bg-indigo-900 dark:text-indigo-400">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </header>

        {loading ? (
          <>
            <SummarySkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormSkeleton />
              <Card className="bg-white/50 backdrop-blur-sm border-indigo-100 shadow-xl dark:bg-gray-800/50 dark:border-indigo-900">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
            <TableSkeleton />
          </>
        ) : (
          <>
            <FinanceSummary entries={calculatedEntries} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FinanceForm onAddEntry={addEntry} lastEntry={lastEntry} />
              <FinanceChart entries={calculatedEntries} />
            </div>

            <MonthlySummary entries={calculatedEntries} />

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">History</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <QuickStats entries={filteredEntries} />
                  <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                  <SortControl 
                    sortField={sortField} 
                    sortOrder={sortOrder} 
                    onSortChange={(field, order) => {
                      setSortField(field);
                      setSortOrder(order);
                    }} 
                  />
                </div>
              </div>
              <FinanceTable 
                entries={sortedEntries} 
                onDeleteEntry={deleteEntry}
                onUpdateEntry={updateEntry}
              />
            </div>
          </>
        )}

        <footer className="pt-12">
          <MadeWithDyad />
        </footer>
      </div>
    </div>
  );
};

export default Index;