"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  amount: number;
  category_1: string;
  is_work: boolean;
  mmm_yyyy: string;
}

interface MonthlyComparisonProps {
  transactions: Transaction[];
}

interface MonthData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  workIncome: number;
  workExpenses: number;
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
}

const MonthlyComparison = ({ transactions }: MonthlyComparisonProps) => {
  const monthlyData = useMemo(() => {
    const months: Record<string, MonthData> = {};

    transactions.forEach(t => {
      const monthKey = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          income: 0,
          expenses: 0,
          net: 0,
          workIncome: 0,
          workExpenses: 0,
          transactionCount: 0,
          topCategory: '',
          topCategoryAmount: 0
        };
      }

      const m = months[monthKey];
      m.transactionCount++;

      if (t.amount > 0) {
        m.income += t.amount;
        if (t.is_work) m.workIncome += t.amount;
      } else {
        const absAmount = Math.abs(t.amount);
        m.expenses += absAmount;
        if (t.is_work) m.workExpenses += absAmount;
      }

      m.net = m.income - m.expenses;
    });

    // Calculate top category per month
    Object.values(months).forEach(m => {
      const categoryTotals: Record<string, number> = {};
      transactions
        .filter(t => {
          const monthKey = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          return monthKey === m.month && t.amount < 0;
        })
        .forEach(t => {
          const cat = t.category_1 || 'Uncategorized';
          categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(t.amount);
        });

      const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        m.topCategory = sorted[0][0];
        m.topCategoryAmount = sorted[0][1];
      }
    });

    return Object.values(months).sort((a, b) => {
      try {
        const parseMonth = (s: string) => {
          const parts = s.split(' ');
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthIdx = monthNames.indexOf(parts[0].toLowerCase().substring(0, 3));
          return new Date(parseInt(parts[1]), monthIdx);
        };
        return parseMonth(b.month).getTime() - parseMonth(a.month).getTime();
      } catch {
        return 0;
      }
    });
  }, [transactions]);

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

  if (monthlyData.length < 2) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Monthly Comparison
          </CardTitle>
          <CardDescription>Need at least 2 months of data to compare</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month-over-Month Cards */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Monthly Comparison
          </CardTitle>
          <CardDescription>Side-by-side comparison of your monthly finances ({monthlyData.length} months)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyData.map((month, i) => {
              const prevMonth = monthlyData[i + 1];
              const incomeChange = prevMonth ? getChangePercent(month.income, prevMonth.income) : null;
              const expenseChange = prevMonth ? getChangePercent(month.expenses, prevMonth.expenses) : null;
              const netChange = prevMonth ? getChangePercent(month.net, prevMonth.net) : null;

              return (
                <div
                  key={month.month}
                  className={cn(
                    "p-5 rounded-2xl border transition-all hover:shadow-lg",
                    month.net >= 0
                      ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-100 dark:from-emerald-950 dark:to-card dark:border-emerald-900"
                      : "bg-gradient-to-br from-rose-50 to-white border-rose-100 dark:from-rose-950 dark:to-card dark:border-rose-900"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">{month.month}</h3>
                    <Badge variant="outline" className="rounded-lg text-xs">
                      {month.transactionCount} txns
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {/* Income */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                        Income
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-600">{formatCurrency(month.income)}</span>
                        {incomeChange !== null && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            incomeChange > 0 ? "bg-emerald-100 text-emerald-700" : incomeChange < 0 ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {incomeChange > 0 ? '+' : ''}{incomeChange}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                        Expenses
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-rose-600">{formatCurrency(-month.expenses)}</span>
                        {expenseChange !== null && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            expenseChange < 0 ? "bg-emerald-100 text-emerald-700" : expenseChange > 0 ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {expenseChange > 0 ? '+' : ''}{expenseChange}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Net */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-sm font-medium">Net</span>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold text-lg",
                          month.net >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(month.net)}
                        </span>
                        {netChange !== null && month.net !== 0 && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            netChange > 0 ? "bg-emerald-100 text-emerald-700" : netChange < 0 ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {netChange > 0 ? '+' : ''}{netChange}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Top Category */}
                    {month.topCategory && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Top spending:</span>
                          <span className="font-medium">{month.topCategory}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                            style={{ width: `${Math.min(100, (month.topCategoryAmount / month.expenses) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Work breakdown */}
                    {(month.workIncome > 0 || month.workExpenses > 0) && (
                      <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span>Work net:</span>
                        <span className={cn(
                          "font-medium",
                          (month.workIncome - month.workExpenses) >= 0 ? "text-amber-600" : "text-rose-600"
                        )}>
                          {formatCurrency(month.workIncome - month.workExpenses)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Averages Summary */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Averages & Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Avg Monthly Income',
                value: formatCurrency(Math.round(monthlyData.reduce((s, m) => s + m.income, 0) / monthlyData.length)),
                color: 'text-emerald-600'
              },
              {
                label: 'Avg Monthly Expenses',
                value: formatCurrency(-Math.round(monthlyData.reduce((s, m) => s + m.expenses, 0) / monthlyData.length)),
                color: 'text-rose-600'
              },
              {
                label: 'Avg Monthly Net',
                value: formatCurrency(Math.round(monthlyData.reduce((s, m) => s + m.net, 0) / monthlyData.length)),
                color: monthlyData.reduce((s, m) => s + m.net, 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              },
              {
                label: 'Avg Transactions/Month',
                value: Math.round(monthlyData.reduce((s, m) => s + m.transactionCount, 0) / monthlyData.length).toString(),
                color: 'text-primary'
              }
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function getChangePercent(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export default MonthlyComparison;