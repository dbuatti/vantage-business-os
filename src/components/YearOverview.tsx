"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types/finance';

interface CategoryGroup {
  category_name: string;
  group_name: string;
}

interface YearOverviewProps {
  transactions: Transaction[];
  categoryGroups: CategoryGroup[];
  availableMonths: string[];
}

const INCOME_GROUPS = [
  { name: '💰 Regular Income', icon: '💰' },
  { name: '🎵 Music Performance', icon: '🎵' },
  { name: '🎹 Music Services', icon: '🎹' },
  { name: '📋 Other Income', icon: '📋' },
];

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', icon: '🏠' },
  { name: 'Flexible Essentials', icon: '🛒' },
  { name: 'Sustenance', icon: '🍽️' },
  { name: 'Wellness & Growth', icon: '🌱' },
  { name: 'Lifestyle & Discretionary', icon: '🎭' },
];

const YearOverview = ({ transactions, categoryGroups, availableMonths }: YearOverviewProps) => {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [showIncome, setShowIncome] = useState(false);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    availableMonths.forEach(m => {
      const parts = m.split(' ');
      if (parts[1]) years.add(parts[1]);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [availableMonths]);

  React.useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const categoryToGroup = useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(cg => { map[cg.category_name] = cg.group_name; });
    return map;
  }, [categoryGroups]);

  const allGroups = [...INCOME_GROUPS, ...EXPENSE_GROUPS];

  const yearData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthNames.map((monthName) => {
      const monthKey = `${monthName} ${selectedYear}`;
      const monthTxns = transactions.filter(t => t.mmm_yyyy === monthKey);

      const income = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

      const groupTotals: Record<string, number> = {};
      allGroups.forEach(g => { groupTotals[g.name] = 0; });
      monthTxns.forEach(t => {
        const group = categoryToGroup[t.category_1] || 'Unmapped';
        if (groupTotals[group] !== undefined) {
          groupTotals[group] += Math.abs(t.amount);
        }
      });

      return {
        month: monthKey,
        shortMonth: monthName,
        income,
        expenses,
        net: income - expenses,
        count: monthTxns.length,
        groupTotals,
        hasData: monthTxns.length > 0
      };
    });
  }, [transactions, selectedYear, categoryToGroup]);

  const yearIncome = yearData.reduce((s, m) => s + m.income, 0);
  const yearExpenses = yearData.reduce((s, m) => s + m.expenses, 0);
  const yearNet = yearIncome - yearExpenses;

  if (availableYears.length === 0) return null;

  const activeGroups = showIncome ? INCOME_GROUPS : EXPENSE_GROUPS;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-lg">Year Overview — {selectedYear}</CardTitle>
            <CardDescription>Monthly breakdown by category group</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <Button
                variant={!showIncome ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowIncome(false)}
                className="rounded-lg h-7 text-xs"
              >
                Expenses
              </Button>
              <Button
                variant={showIncome ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowIncome(true)}
                className="rounded-lg h-7 text-xs"
              >
                Income
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => {
                const idx = availableYears.indexOf(selectedYear);
                if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
              }} className="rounded-xl h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-24 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => {
                const idx = availableYears.indexOf(selectedYear);
                if (idx > 0) setSelectedYear(availableYears[idx - 1]);
              }} className="rounded-xl h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-center">
            <p className="text-xs text-emerald-600 font-medium">Year Income</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(yearIncome)}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-center">
            <p className="text-xs text-rose-600 font-medium">Year Expenses</p>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{formatCurrency(-yearExpenses)}</p>
          </div>
          <div className={cn("p-3 rounded-xl text-center", yearNet >= 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-amber-50 dark:bg-amber-950")}>
            <p className={cn("text-xs font-medium", yearNet >= 0 ? "text-blue-600" : "text-amber-600")}>Year Net</p>
            <p className={cn("text-xl font-bold", yearNet >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300")}>{formatCurrency(yearNet)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold sticky left-0 bg-muted/50 z-10">Month</TableHead>
                <TableHead className="text-xs font-semibold text-right">Total {showIncome ? 'Inc' : 'Exp'}</TableHead>
                {activeGroups.map(g => (
                  <TableHead key={g.name} className="text-xs font-semibold text-right min-w-[100px]">
                    <span className="flex items-center justify-end gap-1" title={g.name}>
                      {g.icon} <span className="hidden lg:inline">{g.name.split(' ').pop()}</span>
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-xs font-semibold text-right sticky right-0 bg-muted/50 z-10">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearData.map((month) => (
                <TableRow key={month.month} className={cn("hover:bg-muted/30", !month.hasData && "opacity-40")}>
                  <TableCell className="font-medium text-sm sticky left-0 bg-background">{month.shortMonth}</TableCell>
                  <TableCell className={cn("text-right text-sm font-bold tabular-nums", showIncome ? "text-emerald-600" : "text-rose-600")}>
                    {month.hasData ? formatCurrency(showIncome ? month.income : -month.expenses) : '—'}
                  </TableCell>
                  {activeGroups.map(g => (
                    <TableCell key={g.name} className="text-right text-xs tabular-nums text-muted-foreground">
                      {month.groupTotals[g.name] > 0 ? formatCurrency(showIncome ? month.groupTotals[g.name] : -month.groupTotals[g.name]) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className={cn("text-right text-sm font-bold tabular-nums sticky right-0 bg-background", month.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {month.hasData ? formatCurrency(month.net) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell className="sticky left-0 bg-muted/30">Total</TableCell>
                <TableCell className={cn("text-right", showIncome ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(showIncome ? yearIncome : -yearExpenses)}
                </TableCell>
                {activeGroups.map(g => {
                  const total = yearData.reduce((s, m) => s + m.groupTotals[g.name], 0);
                  return (
                    <TableCell key={g.name} className="text-right text-muted-foreground">
                      {total > 0 ? formatCurrency(showIncome ? total : -total) : '—'}
                    </TableCell>
                  );
                })}
                <TableCell className={cn("text-right sticky right-0 bg-muted/30", yearNet >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(yearNet)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default YearOverview;