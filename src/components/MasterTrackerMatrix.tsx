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
  isSameWeek,
  differenceInDays,
  endOfWeek
} from 'date-fns';
import { TrackerView } from '@/pages/MasterTracker';
import { Badge } from './ui/badge';

interface MasterTrackerMatrixProps {
  transactions: any[];
  budgets: any[];
  categoryGroups: any[];
  year: number;
  view: TrackerView;
}

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', icon: '🏠' },
  { name: 'Flexible Essentials', icon: '🛒' },
  { name: 'Sustenance', icon: '🍽️' },
  { name: 'Wellness & Growth', icon: '🌱' },
  { name: 'Lifestyle & Discretionary', icon: '🎭' },
];

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
    } else if (view === 'weekly') {
      const now = new Date();
      const targetEnd = now.getFullYear() === year ? now : endOfYear(new Date(year, 0, 1));
      return eachWeekOfInterval({
        start: subWeeks(targetEnd, 11),
        end: targetEnd
      }, { weekStartsOn: 1 });
    } else {
      // Yearly view just has one interval representing the whole year
      return [startOfYear(new Date(year, 0, 1))];
    }
  }, [year, view]);

  const catToGroup = useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(cg => { map[cg.category_name] = cg.group_name; });
    return map;
  }, [categoryGroups]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const matrixData = useMemo(() => {
    const today = new Date();

    return EXPENSE_GROUPS.map(group => {
      const groupCategories = categories.filter(cat => catToGroup[cat] === group.name);
      
      const categoryRows = groupCategories.map(cat => {
        const intervalStats = intervals.map(interval => {
          const intervalTxns = transactions.filter(t => {
            const tDate = parseISO(t.transaction_date);
            if (view === 'monthly') return isSameMonth(tDate, interval);
            if (view === 'daily') return isSameDay(tDate, interval);
            if (view === 'weekly') return isSameWeek(tDate, interval, { weekStartsOn: 1 });
            return true; // Yearly
          }).filter(t => t.category_1 === cat);

          const spent = intervalTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
          
          // Budget logic
          const specificBudget = budgets.find(b => b.category_name === cat && b.month === interval.getMonth() + 1);
          const yearlyBudget = budgets.find(b => b.category_name === cat && (b.month === 0 || b.month === null));
          
          let budget = 0;
          let daysInPeriod = 1;
          let daysRemaining = 1;

          if (view === 'monthly') {
            budget = specificBudget ? specificBudget.amount : (yearlyBudget ? yearlyBudget.amount / 12 : 0);
            daysInPeriod = differenceInDays(endOfMonth(interval), startOfMonth(interval)) + 1;
            daysRemaining = isSameMonth(today, interval) 
              ? Math.max(1, differenceInDays(endOfMonth(interval), today))
              : (interval > today ? daysInPeriod : 1);
          } else if (view === 'weekly') {
            budget = yearlyBudget ? yearlyBudget.amount / 52 : 0;
            daysInPeriod = 7;
            daysRemaining = isSameWeek(today, interval, { weekStartsOn: 1 })
              ? Math.max(1, differenceInDays(endOfWeek(interval, { weekStartsOn: 1 }), today))
              : (interval > today ? 7 : 1);
          } else if (view === 'daily') {
            budget = yearlyBudget ? yearlyBudget.amount / 365 : 0;
            daysInPeriod = 1;
            daysRemaining = 1;
          } else {
            budget = yearlyBudget ? yearlyBudget.amount : 0;
            daysInPeriod = 365;
            daysRemaining = Math.max(1, differenceInDays(endOfYear(interval), today));
          }

          const buffer = budget - spent;
          const dailyBurn = buffer > 0 ? buffer / daysRemaining : 0;

          return {
            spent,
            budget,
            buffer,
            dailyBurn,
            percent: budget > 0 ? (spent / budget) * 100 : 0
          };
        });

        return {
          category: cat,
          intervalStats
        };
      });

      return {
        groupName: group.name,
        icon: group.icon,
        categoryRows
      };
    }).filter(g => g.categoryRows.length > 0);
  }, [categories, intervals, transactions, budgets, view, catToGroup]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-20 min-w-[200px] font-black uppercase text-[10px] tracking-widest">Category</TableHead>
            {intervals.map((interval, i) => (
              <TableHead key={i} className="text-center min-w-[180px] font-black uppercase text-[10px] tracking-widest">
                {view === 'monthly' ? format(interval, 'MMMM') : 
                 view === 'daily' ? format(interval, 'MMM dd') : 
                 view === 'weekly' ? `Week of ${format(interval, 'MMM dd')}` :
                 `Year ${year}`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrixData.map((group) => (
            <React.Fragment key={group.groupName}>
              {/* Group Header Row */}
              <TableRow className="bg-primary/5 hover:bg-primary/5 border-y-2 border-primary/10">
                <TableCell className="sticky left-0 bg-primary/5 z-10 font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="text-lg">{group.icon}</span>
                  {group.groupName}
                </TableCell>
                {intervals.map((_, i) => {
                  const groupSpent = group.categoryRows.reduce((s, r) => s + r.intervalStats[i].spent, 0);
                  const groupBudget = group.categoryRows.reduce((s, r) => s + r.intervalStats[i].budget, 0);
                  const groupPercent = groupBudget > 0 ? (groupSpent / groupBudget) * 100 : 0;
                  return (
                    <TableCell key={i} className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-black text-sm">{formatCurrency(groupSpent)}</span>
                        {groupBudget > 0 && (
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black",
                            groupPercent > 100 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {Math.round(groupPercent)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Category Rows */}
              {group.categoryRows.map((row) => (
                <TableRow key={row.category} className="hover:bg-muted/30 transition-colors group">
                  <TableCell className="sticky left-0 bg-background z-10 font-bold text-sm border-r pl-8">
                    {row.category}
                  </TableCell>
                  {row.intervalStats.map((stat, i) => (
                    <TableCell key={i} className="p-4 border-r last:border-r-0">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn("font-black tabular-nums text-sm", stat.spent > 0 ? "text-foreground" : "text-muted-foreground/30")}>
                            {stat.spent > 0 ? formatCurrency(stat.spent) : '—'}
                          </span>
                          {stat.budget > 0 && (
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              stat.buffer >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                            )}>
                              {stat.buffer >= 0 ? 'SAFE' : 'OVER'}
                            </span>
                          )}
                        </div>

                        {stat.budget > 0 && (
                          <>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all duration-500", stat.percent > 100 ? "bg-rose-500" : "bg-primary")} 
                                style={{ width: `${Math.min(100, stat.percent)}%` }} 
                              />
                            </div>
                            
                            <div className="flex flex-col gap-0.5">
                              <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                                <span className="text-muted-foreground">Buffer:</span>
                                <span className={cn(stat.buffer >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {formatCurrency(stat.buffer)}
                                </span>
                              </div>
                              {stat.buffer > 0 && view !== 'daily' && (
                                <div className="flex justify-between text-[9px] font-medium text-muted-foreground/60 italic">
                                  <span>Daily Burn:</span>
                                  <span>{formatCurrency(stat.dailyBurn)}/day</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MasterTrackerMatrix;