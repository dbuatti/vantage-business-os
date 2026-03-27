"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

interface SettingsContextType {
  selectedYear: string;
  setSelectedYear: (year: string) => Promise<void>;
  availableYears: string[];
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const [selectedYear, setSelectedYearState] = useState<string>(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState<string[]>(['All', new Date().getFullYear().toString()]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchSettings();
      fetchAvailableYears();
    }
  }, [session]);

  const fetchSettings = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('transaction_date');
      
      if (error) throw error;
      
      const years = new Set<string>();
      years.add('All');
      data?.forEach(t => {
        if (t.transaction_date) {
          years.add(new Date(t.transaction_date).getFullYear().toString());
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
    }
  };

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
    }
  };

  return (
    <SettingsContext.Provider value={{ selectedYear, setSelectedYear, availableYears, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};