"use client";

import React, { useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { eachMonthOfInterval, startOfYear, endOfYear, format, isSameMonth, parseISO } from 'date-fns';

interface MasterTrackerMatrixProps {
  transactions: any[];
  budgets: any[];
  categoryGroups: any[];
  year: number;
}

const MasterTrackerMatrix = ({ transactions, budgets, categoryGroups, year }: MasterTrackerMatrixProps) => {
  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1))
    });
  }, [year]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const matrixData = useMemo(() => {
    return categories.map(cat => {
      const monthlyStats = months.map(month => {
        const monthTxns = transactions.filter(t => 
          t.category_1 === cat && 
          isSameMonth(parseISO(t.transaction_date), month)
        );
        const spent = monthTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
        
        // Find budget for this category
        // Logic: Check for specific month budget first, then fallback to yearly/12
        const specificBudget = budgets.find(b => b.category_name === cat && b.month === month.getMonth() + 1);
        const yearlyBudget = budgets.find(b => b.category_name === cat && !b.month);
        const budget = specificBudget ? specificBudget.amount : (yearlyBudget ? yearlyBudget.amount / 12 : 0);

        return {
          month: format(month, 'MMM'),
          spent,
          budget,
          remaining: budget - spent,
          percent: budget > 0 ? (spent / budget) * 100 : 0
        };
      });

      const totalSpent = monthlyStats.reduce((s, m) => s + m.spent, 0);
      const totalBudget = monthlyStats.reduce((s, m) => s + m.budget, 0);

      return {
        category: cat,
        monthlyStats,
        totalSpent,
        totalBudget,
        totalRemaining: totalBudget - totalSpent
      };
    });
  }, [categories, months, transactions, budgets]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-20 min-w-[180px] font-black uppercase text-[10px] tracking-widest">Category</TableHead>
            {months.map(m => (
              <TableHead key={m.getTime()} className="text-center min-w-[120px] font-black uppercase text-[10px] tracking-widest">
                {format(m, 'MMMM')}
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[120px] font-black uppercase text-[10px] tracking-widest bg-primary/5">Year Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrixData.map((row) => (
            <TableRow key={row.category} className="hover:bg-muted/30 transition-colors">
              <TableCell className="sticky left-0 bg-background z-10 font-bold text-sm border-r">
                {row.category}
              </TableCell>
              {row.monthlyStats.map((stat, i) => (
                <TableCell key={i} className="p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black tabular-nums">{formatCurrency(stat.spent)}</span>
                      {stat.budget > 0 && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded",
                          stat.remaining >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {stat.remaining >= 0 ? '✅' : '🚨'} {Math.abs(Math.round(stat.percent))}%
                        </span>
                      )}
                    </div>
                    {stat.budget > 0 && (
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", stat.percent > 100 ? "bg-rose-500" : "bg-primary")} 
                          style={{ width: `${Math.min(100, stat.percent)}%` }} 
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
              ))}
              <TableCell className="text-right bg-primary/5">
                <p className="font-black text-sm">{formatCurrency(row.totalSpent)}</p>
                <p className="text-[10px] text-muted-foreground font-bold">of {formatCurrency(row.totalBudget)}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MasterTrackerMatrix;