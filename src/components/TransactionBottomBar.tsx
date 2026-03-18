"use client";

import React from 'react';
import { cn } from '@/lib/utils';

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
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-lg border-t shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">{filteredCount}</span>
              {filteredCount !== totalCount && <span> of {totalCount}</span>}
              <span className="hidden sm:inline"> transactions</span>
            </span>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-emerald-600 font-medium">+{formatCurrency(totalIncome)}</span>
              <span className="text-rose-600 font-medium">{formatCurrency(-totalExpenses)}</span>
              <span className={cn(
                "font-bold",
                net >= 0 ? "text-emerald-600" : "text-rose-600"
              )}>
                = {formatCurrency(net)}
              </span>
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 text-primary font-medium animate-fade-in">
              <span>{selectedCount} selected</span>
              <span className="text-muted-foreground">·</span>
              <span>{formatCurrency(selectedTotal)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionBottomBar;