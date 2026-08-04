"use client";

import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
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
import { Search } from 'lucide-react';

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
  showOverBudgetOnly?: boolean;
  fullscreen?: boolean;
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

const healthTint = (percent: number, spent: number) => {
  if (spent <= 0 || percent <= 0) return '';
  if (percent > 100) return 'bg-danger/10';
  if (percent >= 70) return 'bg-warning/10';
  return 'bg-profit/10';
};

const healthBadge = (percent: number, spent: number, overText = 'Over') => {
  if (spent <= 0 || percent <= 0) return { label: '', className: '' };
  if (percent > 100) return { label: overText, className: 'text-danger bg-danger-bg' };
  if (percent >= 70) return { label: 'Tight', className: 'text-warning bg-warning-bg' };
  return { label: 'On Track', className: 'text-profit bg-profit-bg' };
};

const MasterTrackerMatrix = ({ 
  transactions, 
  budgets, 
  categoryGroups, 
  year, 
  view, 
  searchQuery,
  showOverBudgetOnly = false,
  fullscreen = false,
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

  const { allGroups, displayGroups } = useMemo(() => {
    const today = new Date();
    const groupNames = new Set(EXPENSE_GROUPS.map(g => g.name));

    const groupBudgetFor = (name: string, month: number | null) =>
      budgets.find(b => b.category_name === name && b.month === month);

    const categoryAnnualShare: Record<string, number> = {};
    EXPENSE_GROUPS.forEach(group => {
      const groupCats = categories.filter(cat => catToGroup[cat] === group.name);
      if (groupCats.length === 0) return;
      const groupAnnual = groupBudgetFor(group.name, 0)?.amount ?? groupBudgetFor(group.name, null)?.amount ?? 0;
      if (groupAnnual <= 0) return;
      const share = groupAnnual / groupCats.length;
      groupCats.forEach(cat => { categoryAnnualShare[cat] = (categoryAnnualShare[cat] || 0) + share; });
    });

    const buildRow = (cat: string) => {
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
        const groupShare = categoryAnnualShare[cat] || 0;
        
        let budget = 0;
        let daysRemaining = 1;

        if (view === 'monthly') {
          budget = specificBudget ? specificBudget.amount : (yearlyBudget ? yearlyBudget.amount / 12 : groupShare / 12);
          daysRemaining = isSameMonth(today, interval) 
            ? Math.max(1, differenceInDays(endOfMonth(interval), today))
            : 1;
        } else if (view === 'weekly') {
          budget = yearlyBudget ? yearlyBudget.amount / 52 : groupShare / 52;
          daysRemaining = isSameWeek(today, interval, { weekStartsOn: 1 })
            ? Math.max(1, differenceInDays(endOfWeek(interval, { weekStartsOn: 1 }), today))
            : 1;
        } else if (view === 'daily') {
          budget = yearlyBudget ? yearlyBudget.amount / 365 : groupShare / 365;
        } else {
          budget = yearlyBudget ? yearlyBudget.amount : groupShare;
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

      const rowTotal = intervalStats.reduce((s, st) => s + st.spent, 0);
      const rowBudgetTotal = intervalStats.reduce((s, st) => s + st.budget, 0);

      return {
        category: cat,
        intervalStats,
        rowTotal,
        rowBudgetTotal
      };
    };

    const matchesSearch = (cat: string) =>
      !searchQuery || cat.toLowerCase().includes(searchQuery.toLowerCase());

    const mappedGroups = EXPENSE_GROUPS.map(group => {
      const groupCategories = categories
        .filter(cat => catToGroup[cat] === group.name)
        .filter(matchesSearch);

      return {
        groupName: group.name,
        icon: group.icon,
        color: group.color,
        categoryRows: groupCategories.map(buildRow)
      };
    });

    const otherCategories = categories
      .filter(cat => !groupNames.has(catToGroup[cat]))
      .filter(matchesSearch);

    if (otherCategories.length > 0) {
      mappedGroups.push({
        groupName: 'Other',
        icon: '🗂️',
        color: 'text-muted-foreground',
        categoryRows: otherCategories.map(buildRow)
      });
    }

    const allGroups = mappedGroups.filter(g => g.categoryRows.length > 0);

    const displayGroups = allGroups
      .map(g => ({
        ...g,
        categoryRows: g.categoryRows.filter(
          row => !showOverBudgetOnly || row.intervalStats.some(s => s.percent > 100 && s.spent > 0)
        )
      }))
      .filter(g => g.categoryRows.length > 0);

    return { allGroups, displayGroups };
  }, [categories, intervals, transactions, budgets, view, catToGroup, searchQuery, year, showOverBudgetOnly]);

  const totalsByColumn = useMemo(() => {
    return intervals.map((_, i) => {
      let total = 0;
      let budget = 0;
      allGroups.forEach(g => {
        g.categoryRows.forEach(row => {
          total += row.intervalStats[i].spent;
          budget += row.intervalStats[i].budget;
        });
      });
      return { total, budget };
    });
  }, [allGroups, intervals]);

  const grandTotal = useMemo(
    () => totalsByColumn.reduce((s, c) => s + c.total, 0),
    [totalsByColumn]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState({ left: false, right: false });

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolled({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    });
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [handleScroll]);

  const leftStickyShadow = scrolled.left ? 'shadow-[6px_0_8px_-4px_rgba(0,0,0,0.12)]' : '';
  const rightStickyShadow = scrolled.right ? 'shadow-[-6px_0_8px_-4px_rgba(0,0,0,0.12)]' : '';

  return (
    <div className={cn("relative", fullscreen && "h-full")}>
      {/* Desktop Matrix View */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={cn(
          "hidden md:block overflow-auto border rounded-2xl overscroll-contain",
          fullscreen ? "h-full max-h-none" : "max-h-[700px]"
        )}
      >
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 z-40 bg-background shadow-sm">
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className={cn(
                "sticky left-0 z-50 min-w-[220px] text-xs font-semibold text-muted-foreground border-r",
                "bg-[color-mix(in_srgb,hsl(var(--background)),hsl(var(--muted))_50%)]",
                leftStickyShadow
              )}>Category</TableHead>
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
              <TableHead className={cn(
                "sticky right-0 z-50 min-w-[130px] text-center text-xs font-semibold text-muted-foreground border-l",
                "bg-[color-mix(in_srgb,hsl(var(--background)),hsl(var(--muted))_50%)]",
                rightStickyShadow
              )}>Total</TableHead>
            </TableRow>

            {/* Column totals row */}
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableCell className={cn(
                "sticky left-0 z-50 min-w-[220px] text-xs font-black uppercase tracking-widest text-foreground border-r",
                "bg-[color-mix(in_srgb,hsl(var(--background)),hsl(var(--muted))_30%)]",
                leftStickyShadow
              )}>
                All Categories
              </TableCell>
              {totalsByColumn.map((col, i) => {
                const pct = col.budget > 0 ? (col.total / col.budget) * 100 : 0;
                return (
                  <TableCell key={i} className="text-center border-r last:border-r-0">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-black text-sm tabular-nums">{formatCurrency(col.total)}</span>
                      {col.budget > 0 && (
                        <Badge variant="outline" className={cn(
                          "text-xs font-semibold opacity-70 px-1.5 py-0",
                          healthBadge(pct, col.total).className
                        )}>
                          {Math.round(pct)}%
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className={cn(
                "sticky right-0 z-50 text-center border-l",
                "bg-[color-mix(in_srgb,hsl(var(--background)),hsl(var(--muted))_30%)]",
                rightStickyShadow
              )}>
                <span className="font-black text-sm tabular-nums">{formatCurrency(grandTotal)}</span>
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayGroups.map((group) => {
              const groupTotal = group.categoryRows.reduce((s, r) => s + r.rowTotal, 0);
              const groupBudgetTotal = group.categoryRows.reduce((s, r) => s + r.rowBudgetTotal, 0);
              const groupPercent = groupBudgetTotal > 0 ? (groupTotal / groupBudgetTotal) * 100 : 0;

              return (
                <React.Fragment key={group.groupName}>
                  {/* Group Header Row */}
                  <TableRow className="bg-primary/5 hover:bg-primary/10 border-y-2 border-primary/10 transition-colors">
                    <TableCell className={cn(
                      "sticky left-0 z-30 text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-2 border-r",
                      "bg-[color-mix(in_srgb,hsl(var(--background)),hsl(var(--primary))_5%)]",
                      leftStickyShadow
                    )}>
                      <span className="text-lg">{group.icon}</span>
                      {group.groupName}
                    </TableCell>
                    {intervals.map((_, i) => {
                      const groupSpent = group.categoryRows.reduce((s, r) => s + r.intervalStats[i].spent, 0);
                      const groupBudget = group.categoryRows.reduce((s, r) => s + r.intervalStats[i].budget, 0);
                      const groupPct = groupBudget > 0 ? (groupSpent / groupBudget) * 100 : 0;
                      return (
                        <TableCell key={i} className="text-center border-r last:border-r-0">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-sm tabular-nums">{formatCurrency(groupSpent)}</span>
                            {groupBudget > 0 && (
                              <Badge variant="outline" className={cn(
                                "text-xs font-semibold opacity-70 px-1.5 py-0",
                                healthBadge(groupPct, groupSpent).className
                              )}>
                                {Math.round(groupPct)}%
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className={cn(
                      "sticky right-0 z-30 text-center border-l",
                      "bg-[color-mix(in_srgb,hsl(var(--background)),hsl(var(--primary))_5%)]",
                      rightStickyShadow
                    )}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-bold text-sm tabular-nums">{formatCurrency(groupTotal)}</span>
                        {groupBudgetTotal > 0 && (
                          <Badge variant="outline" className={cn(
                            "text-xs font-semibold opacity-70 px-1.5 py-0",
                            healthBadge(groupPercent, groupTotal).className
                          )}>
                            {Math.round(groupPercent)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Category Rows */}
                  {group.categoryRows.map((row, rowIndex) => (
                    <TableRow key={row.category} className={cn(
                      "hover:bg-muted/30 transition-colors group border-b",
                      rowIndex % 2 === 1 && "bg-muted/[0.02]"
                    )}>
                      <TableCell className={cn("sticky left-0 bg-background z-30 font-bold text-sm border-r pl-8 group-hover:bg-muted/30 transition-colors", leftStickyShadow)}>
                        {row.category}
                      </TableCell>
                      {row.intervalStats.map((stat, i) => {
                        const isHighlightedMonth = view === 'monthly' && highlightMonth && isSameMonth(intervals[i], highlightMonth);
                        return (
                          <TableCell 
                            key={i} 
                            className={cn(
                              "p-4 border-r last:border-r-0 cursor-pointer hover:bg-primary/[0.05] transition-colors",
                              rowIndex % 2 === 1 && "bg-muted/[0.02]",
                              isHighlightedMonth && "bg-primary/[0.03]",
                              healthTint(stat.percent, stat.spent)
                            )}
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
                                    healthBadge(stat.percent, stat.spent).className
                                  )}>
                                    {healthBadge(stat.percent, stat.spent).label}
                                  </span>
                                )}
                              </div>

                              {stat.budget > 0 && (
                                <div className="space-y-1">
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={cn("h-full rounded-full transition-all duration-500", 
                                        stat.percent > 100 ? "bg-danger" : stat.percent >= 70 ? "bg-warning" : "bg-profit")}
                                      style={{ width: `${Math.min(100, stat.percent)}%` }} 
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs font-semibold text-muted-foreground/60">
                                    <span>Buffer:</span>
                                    <span className={cn(stat.percent > 100 ? "text-danger" : stat.percent >= 70 ? "text-warning" : "text-profit")}>
                                      {formatCurrency(stat.buffer)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className={cn("sticky right-0 bg-background z-30 text-center border-l group-hover:bg-muted/30 transition-colors", rightStickyShadow)}>
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold tabular-nums text-sm">{formatCurrency(row.rowTotal)}</span>
                          {row.rowBudgetTotal > 0 && (
                            <span className={cn(
                              "text-xs font-semibold opacity-70 px-1.5 py-0.5 rounded",
                              healthBadge(row.rowBudgetTotal > 0 ? (row.rowTotal / row.rowBudgetTotal) * 100 : 0, row.rowTotal).className
                            )}>
                              {healthBadge(row.rowBudgetTotal > 0 ? (row.rowTotal / row.rowBudgetTotal) * 100 : 0, row.rowTotal).label}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
        {displayGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-3 rounded-xl bg-muted/50 mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">No categories found</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {showOverBudgetOnly
                ? 'No categories are over budget in this view.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-8">
        {displayGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-3 rounded-xl bg-muted/50 mb-3">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">No categories found</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {showOverBudgetOnly
                ? 'No categories are over budget in this view.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        )}
        {displayGroups.map((group) => (
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
                          <p className="font-black text-lg tabular-nums">{formatCurrency(latestStat.spent)}</p>
                          {latestStat.budget > 0 && (
                            <Badge variant="outline" className={cn(
                              "text-xs font-semibold opacity-70",
                              healthBadge(latestStat.percent, latestStat.spent).className
                            )}>
                              {Math.round(latestStat.percent)}% of budget
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {latestStat.budget > 0 && (
                        <div className="space-y-1.5">
                          <Progress value={latestStat.percent} className={cn("h-1.5", latestStat.percent > 100 ? "[&>div]:bg-danger" : latestStat.percent >= 70 ? "[&>div]:bg-warning" : "[&>div]:bg-profit")} />
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>Remaining Buffer</span>
                            <span className={cn(latestStat.percent > 100 ? "text-danger" : latestStat.percent >= 70 ? "text-warning" : "text-profit")}>
                              {formatCurrency(latestStat.buffer)}
                            </span>
                          </div>
                        </div>
                      )}

                      {row.rowTotal > 0 && (
                        <div className="flex justify-between text-xs font-semibold text-muted-foreground border-t border-dashed pt-2">
                          <span>Year total</span>
                          <span className="font-bold tabular-nums text-foreground">{formatCurrency(row.rowTotal)}</span>
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
