"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatedEntry } from '@/types/finance';
import { Wallet, CreditCard, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinanceSummaryProps {
  entries: CalculatedEntry[];
}

const FinanceSummary = ({ entries }: FinanceSummaryProps) => {
  const latestSavings = entries.find(e => e.account === 'Savings')?.amount || 0;
  const latestCredit = entries.find(e => e.account === 'Credit')?.amount || 0;
  const totalNet = latestSavings + latestCredit;

  // Calculate weekly change
  const savingsEntries = entries.filter(e => e.account === 'Savings');
  const creditEntries = entries.filter(e => e.account === 'Credit');
  
  const savingsChange = savingsEntries.length >= 2 
    ? savingsEntries[0].amount - savingsEntries[1].amount 
    : 0;
  const creditChange = creditEntries.length >= 2 
    ? creditEntries[0].amount - creditEntries[1].amount 
    : 0;
  const netChange = savingsChange + creditChange;

  // Calculate averages (last 4 entries)
  const recentSavings = savingsEntries.slice(0, 4);
  const avgSavingsChange = recentSavings.length >= 2
    ? recentSavings.reduce((sum, e, i) => {
        if (i === 0) return sum;
        return sum + (e.amount - recentSavings[i - 1].amount);
      }, 0) / (recentSavings.length - 1)
    : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatChange = (val: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always',
    }).format(val);
    return val >= 0 ? `+${formatted.slice(1)}` : formatted;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
            <Wallet className="w-4 h-4" />
            Current Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(latestSavings)}</div>
          {savingsChange !== 0 && (
            <div className={cn(
              "text-sm mt-1 flex items-center gap-1",
              savingsChange > 0 ? "text-blue-100" : "text-blue-200"
            )}>
              {savingsChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatChange(savingsChange)} this week
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
            <CreditCard className="w-4 h-4" />
            Credit Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(latestCredit)}</div>
          {creditChange !== 0 && (
            <div className={cn(
              "text-sm mt-1 flex items-center gap-1",
              creditChange > 0 ? "text-amber-100" : "text-amber-200"
            )}>
              {creditChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatChange(creditChange)} this week
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
            <TrendingUp className="w-4 h-4" />
            Net Worth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalNet)}</div>
          {netChange !== 0 && (
            <div className={cn(
              "text-sm mt-1 flex items-center gap-1",
              netChange > 0 ? "text-indigo-100" : "text-indigo-200"
            )}>
              {netChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatChange(netChange)} this week
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
            <BarChart3 className="w-4 h-4" />
            Avg Weekly Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatChange(avgSavingsChange)}</div>
          <div className="text-sm mt-1 text-emerald-100 opacity-80">
            Based on last {Math.min(recentSavings.length, 4)} entries
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceSummary;