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
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { 
  eachMonthOfInterval, 
  startOfYear, 
  endOfYear, 
  format, 
  isSameMonth, 
  parseISO,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
  eachWeekOfInterval,
  subWeeks,
  isSameWeek
} from 'date-fns';
import { TrackerView } from '@/pages/MasterTracker';

interface MasterTrackerMatrixProps {
  transactions: any[];
  budgets: any[];
  categoryGroups: any[];
  year: number;
  view: TrackerView;
}

const MasterTrackerMatrix = ({ transactions, budgets, categoryGroups, year, view }: MasterTrackerMatrixProps) => {
  const intervals = useMemo(() => {
    if (view === 'monthly') {
      return eachMonthOfInterval({
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1))
      });
    } else if (view === 'daily') {
      const now = new Date();
      const targetMonth = now.getFullYear() === year ? now : new Date(year, 0, 1);
      return eachDayOfInterval({
        start: startOfMonth(targetMonth),
        end: endOfMonth(targetMonth)
      });
    } else {
      const now = new Date();
      const targetEnd = now.getFullYear() === year ? now : endOfYear(new Date(year, 0, 1));
      return eachWeekOfInterval({
        start: subWeeks(targetEnd, 11),
        end: targetEnd
      }, { weekStartsOn: 1 });
    }
  }, [year, view]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const matrixData = useMemo(() => {
    return categories.map(cat => {
      const intervalStats = intervals.map(interval => {
        const intervalTxns = transactions.filter(t => {
          const tDate = parseISO(t.transaction_date);
          if (view === 'monthly') return isSameMonth(tDate, interval);
          if (view === 'daily') return isSameDay(tDate, interval);
          return isSameWeek(tDate, interval, { weekStartsOn: 1 });
        }).filter(t => t.category_1 === cat);

        const spent = intervalTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
        
        // Budget logic: Look for specific month budget or yearly budget (month 0)
        const specificBudget = budgets.find(b => b.category_name === cat && b.month === interval.getMonth() + 1);
        const yearlyBudget = budgets.find(b => b.category_name === cat && (b.month === 0 || b.month === null));
        
        let budget = 0;
        if (view === 'monthly') {
          budget = specificBudget ? specificBudget.amount : (yearlyBudget ? yearlyBudget.amount / 12 : 0);
        } else if (view === 'weekly') {
          budget = yearlyBudget ? yearlyBudget.amount / 52 : 0;
        } else {
          budget = yearlyBudget ? yearlyBudget.amount / 365 : 0;
        }

        return {
          label: view === 'monthly' ? format(interval, 'MMM') : view === 'daily' ? format(interval, 'dd') : `W${format(interval, 'w')}`,
          spent,
          budget,
          remaining: budget - spent,
          percent: budget > 0 ? (spent / budget) * 100 : 0
        };
      });

      const totalSpent = intervalStats.reduce((s, m) => s + m.spent, 0);
      const totalBudget = view === 'monthly' 
        ? intervalStats.reduce((s, m) => s + m.budget, 0)
        : (budgets.find(b => b.category_name === cat && (b.month === 0 || b.month === null))?.amount || 0);

      return {
        category: cat,
        intervalStats,
        totalSpent,
        totalBudget
      };
    });
  }, [categories, intervals, transactions, budgets, view]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-20 min-w-[180px] font-black uppercase text-[10px] tracking-widest">Category</TableHead>
            {intervals.map((interval, i) => (
              <TableHead key={i} className="text-center min-w-[100px] font-black uppercase text-[10px] tracking-widest">
                {view === 'monthly' ? format(interval, 'MMMM') : 
                 view === 'daily' ? format(interval, 'MMM dd') : 
                 `Week of ${format(interval, 'MMM dd')}`}
              </TableHead>
            ))}
            <TableHead className="text-right min-w-[120px] font-black uppercase text-[10px] tracking-widest bg-primary/5">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrixData.map((row) => (
            <TableRow key={row.category} className="hover:bg-muted/30 transition-colors">
              <TableCell className="sticky left-0 bg-background z-10 font-bold text-sm border-r">
                {row.category}
              </TableCell>
              {row.intervalStats.map((stat, i) => (
                <TableCell key={i} className="p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={cn("font-black tabular-nums", stat.spent > 0 ? "text-foreground" : "text-muted-foreground/40")}>
                        {stat.spent > 0 ? formatCurrency(stat.spent) : '—'}
                      </span>
                      {stat.budget > 0 && stat.spent > 0 && (
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.5 rounded",
                          stat.remaining >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {Math.round(stat.percent)}%
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
                {row.totalBudget > 0 && (
                  <p className="text-[10px] text-muted-foreground font-bold">of {formatCurrency(row.totalBudget)}</p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MasterTrackerMatrix;