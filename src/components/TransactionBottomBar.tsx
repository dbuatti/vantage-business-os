"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { TrendingUp, TrendingDown, Calculator, CheckCircle2 } from 'lucide-react';

interface TransactionBottomBarProps {
  totalCount: number;
  filteredCount: number;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  selectedCount: number;
  selectedTotal: number;
}

const TransactionBottomBar = ({
  totalCount,
  filteredCount,
  totalIncome,
  totalExpenses,
  net,
  selectedCount,
  selectedTotal
}: TransactionBottomBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-t shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                <span className="text-foreground">{filteredCount}</span>
                {filteredCount !== totalCount && <span className="opacity-50"> / {totalCount}</span>}
                <span className="ml-1 hidden md:inline">Transactions</span>
              </span>
            </div>
            
            <div className="h-4 w-[1px] bg-border hidden sm:block" />

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-black text-emerald-600">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-sm font-black text-rose-600">{formatCurrency(-totalExpenses)}</span>
              </div>
              <div className={cn(
                "px-2.5 py-1 rounded-lg font-black text-sm tabular-nums shadow-sm",
                net >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              )}>
                {formatCurrency(net)}
              </div>
            </div>
          </div>

          {selectedCount > 0 ? (
            <div className="flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-black uppercase tracking-widest">{selectedCount} Selected</span>
                <div className="w-[1px] h-3 bg-white/30 mx-1" />
                <span className="text-sm font-black">{formatCurrency(selectedTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Data Sync Active
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionBottomBar;