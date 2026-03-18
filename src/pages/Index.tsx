"use client";

import React, { useState, useEffect } from 'react';
import FinanceForm from '@/components/FinanceForm';
import FinanceTable from '@/components/FinanceTable';
import FinanceSummary from '@/components/FinanceSummary';
import { FinanceEntry, CalculatedEntry } from '@/types/finance';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { PiggyBank } from 'lucide-react';

const Index = () => {
  const [entries, setEntries] = useState<FinanceEntry[]>(() => {
    const saved = localStorage.getItem('finance_entries');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('finance_entries', JSON.stringify(entries));
  }, [entries]);

  const addEntry = (entry: FinanceEntry) => {
    setEntries(prev => [entry, ...prev]);
  };

  // Calculate differences based on previous entries of the same account type
  const calculatedEntries: CalculatedEntry[] = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((entry, index, allEntries) => {
      // Find the previous entry for this specific account
      const previousEntry = allEntries.slice(index + 1).find(e => e.account === entry.account);
      
      let difference = 0;
      if (previousEntry) {
        difference = entry.amount - previousEntry.amount;
      } else if (entry.account === 'Credit' && entry.creditWas !== undefined) {
        // For the very first credit entry, we can use "creditWas" as the baseline
        difference = entry.amount - entry.creditWas;
      }

      return {
        ...entry,
        difference
      };
    });

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
              Track your savings and credit progress every Thursday
            </p>
          </div>
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