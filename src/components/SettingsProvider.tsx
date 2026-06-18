"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showError } from '@/utils/toast';

interface SettingsContextType {
  selectedYear: string;
  setSelectedYear: (year: string) => Promise<void>;
  availableYears: string[];
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYearState] = useState<string>(currentYear);
  const [availableYears, setAvailableYears] = useState<string[]>(['All', currentYear]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('selected_transaction_year')
        .eq('owner_user_id', session?.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.selected_transaction_year) {
        setSelectedYearState(data.selected_transaction_year);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      showError(error instanceof Error ? error.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchAvailableYears = useCallback(async () => {
    try {
      // Check both tables for unique years
      const [txnsRes, entriesRes] = await Promise.all([
        supabase.from('finance_transactions').select('transaction_date'),
        supabase.from('finance_entries').select('date')
      ]);
      
      const years = new Set<string>();
      years.add('All');
      years.add(currentYear); // Always include current year
      
      txnsRes.data?.forEach(t => {
        if (t.transaction_date) {
          years.add(new Date(t.transaction_date).getFullYear().toString());
        }
      });

      entriesRes.data?.forEach(e => {
        if (e.date) {
          years.add(new Date(e.date).getFullYear().toString());
        }
      });
      
      const sortedYears = Array.from(years).sort((a, b) => {
        if (a === 'All') return -1;
        if (b === 'All') return 1;
        return b.localeCompare(a);
      });
      
      setAvailableYears(sortedYears);
    } catch (error) {
      console.error("Error fetching years:", error);
      showError(error instanceof Error ? error.message : 'Failed to load years');
    }
  }, [currentYear]);

  useEffect(() => {
    if (session) {
      fetchSettings();
      fetchAvailableYears();
    }
  }, [session, fetchSettings, fetchAvailableYears]);

  const setSelectedYear = async (year: string) => {
    setSelectedYearState(year);
    if (!session) return;

    try {
      await supabase
        .from('settings')
        .upsert({ 
          owner_user_id: session.user.id, 
          selected_transaction_year: year,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error("Error saving year preference:", error);
      showError(error instanceof Error ? error.message : 'Failed to save year preference');
    }
  };

  return (
    <SettingsContext.Provider value={{ selectedYear, setSelectedYear, availableYears, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};