"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import SearchBar from '@/components/SearchBar';
import UndoToast from '@/components/UndoToast';
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

interface DeletedEntry {
  entry: FinanceEntry;
  timeoutId: NodeJS.Timeout;
}

const Index = () => {
  const { session, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [duplicateEntry, setDuplicateEntry] = useState<CalculatedEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedEntry, setDeletedEntry] = useState<DeletedEntry | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchEntries();
    }
  }, [session, authLoading, navigate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deletedEntry?.timeoutId) {
        clearTimeout(deletedEntry.timeoutId);
      }
    };
  }, [deletedEntry]);

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

  const deleteEntry = useCallback(async (id: string) => {
    // Find the entry to delete
    const entryToDelete = entries.find(e => e.id === id);
    if (!entryToDelete) return;

    // Clear any existing undo timeout
    if (deletedEntry?.timeoutId) {
      clearTimeout(deletedEntry.timeoutId);
    }

    // Optimistically remove from UI
    setEntries(prev => prev.filter(e => e.id !== id));

    // Set up undo timeout
    const timeoutId = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('finance_entries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setDeletedEntry(null);
      } catch (error: any) {
        showError(error.message);
        // Restore entry on error
        setEntries(prev => [...prev, entryToDelete].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
        setDeletedEntry(null);
      }
    }, 6000);

    setDeletedEntry({ entry: entryToDelete, timeoutId });
  }, [entries, deletedEntry]);

  const undoDelete = useCallback(() => {
    if (!deletedEntry) return;
    
    clearTimeout(deletedEntry.timeoutId);
    setEntries(prev => [...prev, deletedEntry.entry].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ));
    setDeletedEntry(null);
    showSuccess('Entry restored');
  }, [deletedEntry]);

  const dismissUndo = useCallback(() => {
    setDeletedEntry(null);
  }, []);

  const handleDuplicateEntry = (entry: CalculatedEntry) => {
    setDuplicateEntry(entry);
    showSuccess('Entry values copied to form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
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

  const filteredEntries = useMemo(() => {
    let result = calculatedEntries;
    
    // Apply date range filter
    if (dateRange.from || dateRange.to) {
      result = result.filter(entry => {
        const entryDate = parseISO(entry.date);
        if (dateRange.from && dateRange.to) {
          return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
        }
        if (dateRange.from) return entryDate >= dateRange.from;
        if (dateRange.to) return entryDate <= dateRange.to;
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(entry => {
        const dateStr = entry.date.toLowerCase();
        const accountStr = entry.account.toLowerCase();
        const amountStr = entry.amount.toString();
        const creditWasStr = entry.creditWas?.toString() || '';
        
        return dateStr.includes(query) || 
               accountStr.includes(query) || 
               amountStr.includes(query) ||
               creditWasStr.includes(query);
      });
    }

    return result;
  }, [calculatedEntries, dateRange, searchQuery]);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-purple-600 rounded-xl text-white shadow-lg shadow-primary/25">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold tracking-tight">Weekly Finance Log</h1>
                <p className="text-xs text-muted-foreground -mt-0.5">{session.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SearchBar 
                value={searchQuery} 
                onChange={setSearchQuery}
                placeholder="Search entries..."
              />
              <div className="hidden sm:flex items-center gap-2">
                <KeyboardShortcuts />
                <ThemeToggle />
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleSignOut} 
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        {loading ? (
          <>
            <SummarySkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormSkeleton />
              <Card className="bg-card/80 backdrop-blur-sm border shadow-xl">
                <CardHeader>
                  <Skeleton className="h-6 w-36 rounded-lg" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full rounded-xl" />
                </CardContent>
              </Card>
            </div>
            <TableSkeleton />
          </>
        ) : (
          <>
            <FinanceSummary entries={calculatedEntries} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FinanceForm 
                onAddEntry={addEntry} 
                lastEntry={lastEntry}
                duplicateEntry={duplicateEntry}
                onClearDuplicate={() => setDuplicateEntry(null)}
              />
              <FinanceChart entries={calculatedEntries} />
            </div>

            <MonthlySummary entries={calculatedEntries} />

            <div className="space-y-4 animate-slide-up opacity-0 stagger-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight">History</h2>
                  {searchQuery && (
                    <span className="text-sm text-muted-foreground">
                      {filteredEntries.length} results for "{searchQuery}"
                    </span>
                  )}
                </div>
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
                  <ExportButton entries={sortedEntries} />
                </div>
              </div>
              <FinanceTable 
                entries={sortedEntries} 
                onDeleteEntry={deleteEntry}
                onUpdateEntry={updateEntry}
                onDuplicateEntry={handleDuplicateEntry}
              />
            </div>
          </>
        )}

        <footer className="pt-8 pb-4">
          <MadeWithDyad />
        </footer>
      </div>

      {/* Undo Toast */}
      {deletedEntry && (
        <UndoToast
          message="Entry deleted"
          onUndo={undoDelete}
          onDismiss={dismissUndo}
        />
      )}
    </div>
  );
};

export default Index;