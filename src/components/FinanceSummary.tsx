"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatedEntry } from '@/types/finance';
import { Wallet, CreditCard, TrendingUp } from 'lucide-react';

interface FinanceSummaryProps {
  entries: CalculatedEntry[];
}

const FinanceSummary = ({ entries }: FinanceSummaryProps) => {
  const latestSavings = entries.find(e => e.account === 'Savings')?.amount || 0;
  const latestCredit = entries.find(e => e.account === 'Credit')?.amount || 0;
  
  const totalNet = latestSavings + latestCredit;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
            <Wallet className="w-4 h-4" />
            Current Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(latestSavings)}</div>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceSummary;