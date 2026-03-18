"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalculatedEntry } from '@/types/finance';
import { CalendarDays, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlySummaryProps {
  entries: CalculatedEntry[];
}

interface MonthData {
  monthYear: string;
  savings: { total: number; change: number; count: number };
  credit: { total: number; change: number; count: number };
  netChange: number;
}

const MonthlySummary = ({ entries }: MonthlySummaryProps) => {
  const monthlyData = entries.reduce((acc, entry) => {
    const key = entry.monthYear;
    if (!acc[key]) {
      acc[key] = {
        monthYear: key,
        savings: { total: 0, change: 0, count: 0 },
        credit: { total: 0, change: 0, count: 0 },
        netChange: 0
      };
    }
    
    if (entry.account === 'Savings') {
      acc[key].savings.total = entry.amount;
      acc[key].savings.change += entry.difference;
      acc[key].savings.count++;
    } else {
      acc[key].credit.total = entry.amount;
      acc[key].credit.change += entry.difference;
      acc[key].credit.count++;
    }
    
    acc[key].netChange = acc[key].savings.change + acc[key].credit.change;
    
    return acc;
  }, {} as Record<string, MonthData>);

  const months = Object.values(monthlyData)
    .sort((a, b) => {
      const dateA = parse(a.monthYear, 'MM/yyyy', new Date());
      const dateB = parse(b.monthYear, 'MM/yyyy', new Date());
      return dateB.getTime() - dateA.getTime();
    });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatChange = (val: number) => {
    const abs = Math.abs(val);
    const sign = val >= 0 ? '+' : '-';
    return `${sign}${formatCurrency(abs)}`;
  };

  if (months.length === 0) return null;

  return (
    <Card className="border shadow-xl bg-card/80 backdrop-blur-sm animate-slide-up opacity-0 stagger-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          Monthly Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {months.map((month, i) => {
            const monthDate = parse(month.monthYear, 'MM/yyyy', new Date());
            const isPositive = month.netChange > 0;
            const isNegative = month.netChange < 0;
            
            return (
              <div 
                key={month.monthYear}
                className={cn(
                  "p-4 rounded-2xl border transition-all hover:shadow-md",
                  isPositive && "bg-gradient-to-br from-emerald-50 to-white border-emerald-100 dark:from-emerald-950 dark:to-card dark:border-emerald-900",
                  isNegative && "bg-gradient-to-br from-rose-50 to-white border-rose-100 dark:from-rose-950 dark:to-card dark:border-rose-900",
                  !isPositive && !isNegative && "bg-gradient-to-br from-gray-50 to-white border-gray-100 dark:from-gray-900 dark:to-card"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm">
                    {format(monthDate, 'MMMM yyyy')}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                    isPositive && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                    isNegative && "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
                    !isPositive && !isNegative && "bg-gray-100 text-gray-500"
                  )}>
                    {isPositive && <ArrowUpRight className="w-3 h-3" />}
                    {isNegative && <ArrowDownRight className="w-3 h-3" />}
                    {formatChange(month.netChange)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground font-medium">Savings</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(month.savings.total)}
                    </div>
                    {month.savings.count > 0 && (
                      <div className={cn(
                        "text-xs font-medium",
                        month.savings.change > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatChange(month.savings.change)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground font-medium">Credit</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(month.credit.total)}
                    </div>
                    {month.credit.count > 0 && (
                      <div className={cn(
                        "text-xs font-medium",
                        month.credit.change > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatChange(month.credit.change)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySummary;