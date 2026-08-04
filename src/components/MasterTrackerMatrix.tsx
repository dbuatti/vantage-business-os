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
  isSameWeek,
  differenceInDays,
  endOfWeek
} from 'date-fns';
import { TrackerView } from '@/pages/MasterTracker';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';

interface TransactionLike {
  id?: string;
  transaction_date: string;
  amount: number;
  category_1: string;
  notes?: string;
  description?: string;
  category_2?: string;
}

interface BudgetLike {
  category_name: string;
  amount: number;
  month: number | null;
}

interface MasterTrackerMatrixProps {
  transactions: TransactionLike[];
  budgets: BudgetLike[];
  categoryGroups: Array<{ category_name: string; group_name: string }>;
  year: number;
  view: TrackerView;
  searchQuery: string;
  highlightMonth?: Date;
  onCellClick: (category: string, periodLabel: string, txns: TransactionLike[], budget: number) => void;
}

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', icon: '🏠', color: 'text-primary' },
  { name: 'Flexible Essentials', icon: '🛒', color: 'text-warning' },
  { name: 'Sustenance', icon: '🍽️', color: 'text-profit' },
  { name: 'Wellness & Growth', icon: '🌱', color: 'text-ai' },
  { name: 'Lifestyle & Discretionary', icon: '🎭', color: 'text-danger' },
];

const MasterTrackerMatrix = ({ 
  transactions, 
  budgets, 
  categoryGroups, 
  year, 
  view, 
  searchQuery,
  highlightMonth,
  onCellClick 
}: MasterTrackerMatrixProps) => {
  const intervals = useMemo(() => {
    if (view === 'monthly') {
      return eachMonthOfInterval({
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1))
      });
    } else if (view === 'daily') {
      const anchor = highlightMonth && highlightMonth.getFullYear() === year
        ? highlightMonth
        : new Date(year, 0, 1);
      return eachDayOfInterval({
        start: startOfMonth(anchor),
        end: endOfMonth(anchor)
      });
    } else if (view === 'weekly') {
      return eachWeekOfInterval({
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1))
      }, { weekStartsOn: 1 });
    } else {
      return [startOfYear(new Date(year, 0, 1))];
    }
  }, [year, view, highlightMonth]);

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
      const groupCategories = categories.filter(cat => {
        const matchesGroup = catToGroup[cat] === group.name;
        const matchesSearch = !searchQuery || cat.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGroup && matchesSearch;
      });
      
      const categoryRows = groupCategories.map(cat => {
        const intervalStats = intervals.map(interval => {
          const intervalTxns = transactions.filter(t => {
            const tDate = parseISO(t.transaction_date);
            if (view === 'monthly') return isSameMonth(tDate, interval);
            if (view === 'daily') return isSameDay(tDate, interval);
            if (view === 'weekly') return isSameWeek(tDate, interval, { weekStartsOn: 1 });
            return true;
          }).filter(t => t.category_1 === cat);

          const spent = intervalTxns.reduce((s, t) => s + Math.abs(t.amount), 0);
          
          const specificBudget = budgets.find(b => b.category_name === cat && b.month === interval.getMonth() + 1);
          const yearlyBudget = budgets.find(b => b.category_name === cat && (b.month === 0 || b.month === null));
          
          let budget = 0;
          let daysRemaining = 1;

          if (view === 'monthly') {
            budget = specificBudget ? specificBudget.amount : (yearlyBudget ? yearlyBudget.amount / 12 : 0);
            daysRemaining = isSameMonth(today, interval) 
              ? Math.max(1, differenceInDays(endOfMonth(interval), today))
              : 1;
          } else if (view === 'weekly') {
            budget = yearlyBudget ? yearlyBudget.amount / 52 : 0;
            daysRemaining = isSameWeek(today, interval, { weekStartsOn: 1 })
              ? Math.max(1, differenceInDays(endOfWeek(interval, { weekStartsOn: 1 }), today))
              : 1;
          } else if (view === 'daily') {
            budget = yearlyBudget ? yearlyBudget.amount / 365 : 0;
          } else {
            budget = yearlyBudget ? yearlyBudget.amount : 0;
          }

          const buffer = budget - spent;
          const percent = budget > 0 ? (spent / budget) * 100 : 0;

          return {
            spent,
            budget,
            buffer,
            percent,
            txns: intervalTxns,
            label: view === 'monthly' ? format(interval, 'MMMM') : 
                   view === 'daily' ? format(interval, 'MMM dd') : 
                   view === 'weekly' ? `Week of ${format(interval, 'MMM dd')}` :
                   `Year ${year}`
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
        color: group.color,
        categoryRows
      };
    }).filter(g => g.categoryRows.length > 0);
  }, [categories, intervals, transactions, budgets, view, catToGroup, searchQuery, year]);

  return (
    <div className="relative">
      {/* Desktop Matrix View */}
      <div className="hidden md:block overflow-x-auto max-h-[700px] border rounded-2xl">
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 z-40 bg-background shadow-sm">
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-50 min-w-[220px] text-xs font-semibold text-muted-foreground border-r">Category</TableHead>
              {intervals.map((interval, i) => {
                const isHighlighted = highlightMonth && view === 'monthly' && isSameMonth(interval, highlightMonth);
                return (
                  <TableHead key={i} className={cn(
                    "text-center min-w-[180px] text-xs font-semibold text-muted-foreground border-r last:border-r-0",
                    isHighlighted && "bg-primary/10 text-primary"
                  )}>
                    {view === 'monthly' ? format(interval, 'MMMM') : 
                     view === 'daily' ? format(interval, 'MMM dd') : 
                     view === 'weekly' ? `Week of ${format(interval, 'MMM dd')}` :
                     `Year ${year}`}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrixData.map((group) => (
              <React.Fragment key={group.groupName}>
                {/* Group Header Row */}
                <TableRow className="bg-primary/5 hover:bg-primary/10 border-y-2 border-primary/10 transition-colors">
                  <TableCell className="sticky left-0 bg-primary/5 z-30 text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-2 border-r">
                    <span className="text-lg">{group.icon}</span>
                    {group.groupName}
                  </TableCell>
                  {intervals.map((_, i) => {
                    const groupSpent = group.categoryRows.reduce((s, r) => s + r.intervalStats[i].spent, 0);
                    const groupBudget = group.categoryRows.reduce((s, r) => s + r.intervalStats[i].budget, 0);
                    const groupPercent = groupBudget > 0 ? (groupSpent / groupBudget) * 100 : 0;
                    return (
                      <TableCell key={i} className="text-center border-r last:border-r-0">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-bold text-sm">{formatCurrency(groupSpent)}</span>
                          {groupBudget > 0 && (
                            <Badge variant="outline" className={cn(
                              "text-xs font-semibold opacity-70 px-1.5 py-0",
                              groupPercent > 100 ? "bg-danger-bg text-danger border-danger-border" : "bg-profit-bg text-profit border-profit-border"
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
                  <TableRow key={row.category} className="hover:bg-muted/30 transition-colors group border-b">
                    <TableCell className="sticky left-0 bg-background z-30 font-bold text-sm border-r pl-8 group-hover:bg-muted/30 transition-colors">
                      {row.category}
                    </TableCell>
                    {row.intervalStats.map((stat, i) => (
                      <TableCell 
                        key={i} 
                        className="p-4 border-r last:border-r-0 cursor-pointer hover:bg-primary/[0.05] transition-colors"
                        onClick={() => onCellClick(row.category, stat.label, stat.txns, stat.budget)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={cn("font-bold tabular-nums text-sm", stat.spent > 0 ? "text-foreground" : "text-muted-foreground/20")}>
                              {stat.spent > 0 ? formatCurrency(stat.spent) : '—'}
                            </span>
                            {stat.budget > 0 && (
                              <span className={cn(
                                "text-xs font-semibold opacity-70 px-1.5 py-0.5 rounded",
                                stat.buffer >= 0 ? "text-profit bg-profit-bg" : "text-danger bg-danger-bg"
                              )}>
                                {stat.buffer >= 0 ? 'Safe' : 'Over'}
                              </span>
                            )}
                          </div>

                          {stat.budget > 0 && (
                            <div className="space-y-1">
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={cn("h-full rounded-full transition-all duration-500", stat.percent > 100 ? "bg-danger" : "bg-primary")}
                                  style={{ width: `${Math.min(100, stat.percent)}%` }} 
                                />
                              </div>
                              <div className="flex justify-between text-xs font-semibold text-muted-foreground/60">
                                <span>Buffer:</span>
                                <span className={cn(stat.buffer >= 0 ? "text-profit" : "text-danger")}>
                                  {formatCurrency(stat.buffer)}
                                </span>
                              </div>
                            </div>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-8">
        {matrixData.map((group) => (
          <div key={group.groupName} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xl">{group.icon}</span>
              <h3 className="font-bold text-sm uppercase tracking-widest text-primary">{group.groupName}</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {group.categoryRows.map((row) => {
                // For mobile, we show the most recent interval with data
                const latestStat = [...row.intervalStats].reverse().find(s => s.spent > 0) || row.intervalStats[row.intervalStats.length - 1];
                
                return (
                  <Card key={row.category} className="border-0 shadow-md overflow-hidden" onClick={() => onCellClick(row.category, latestStat.label, latestStat.txns, latestStat.budget)}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm">{row.category}</p>
                          <p className="text-xs font-semibold text-muted-foreground">{latestStat.label}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-lg">{formatCurrency(latestStat.spent)}</p>
                          {latestStat.budget > 0 && (
                            <Badge variant="outline" className={cn(
                              "text-xs font-semibold opacity-70",
                              latestStat.percent > 100 ? "bg-danger-bg text-danger" : "bg-profit-bg text-profit"
                            )}>
                              {Math.round(latestStat.percent)}% of budget
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {latestStat.budget > 0 && (
                        <div className="space-y-1.5">
                          <Progress value={latestStat.percent} className={cn("h-1.5", latestStat.percent > 100 ? "[&>div]:bg-danger" : "[&>div]:bg-primary")} />
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>Remaining Buffer</span>
                            <span className={cn(latestStat.buffer >= 0 ? "text-profit" : "text-danger")}>
                              {formatCurrency(latestStat.buffer)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterTrackerMatrix;