"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Target,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  is_work: boolean;
  mmm_yyyy: string;
}

interface TransactionStatsProps {
  transactions: Transaction[];
}

const TransactionStats = ({ transactions }: TransactionStatsProps) => {
  const stats = useMemo(() => {
    if (transactions.length === 0) return null;

    const income = transactions.filter(t => t.amount > 0);
    const expenses = transactions.filter(t => t.amount < 0);
    const totalIncome = income.reduce((s, t) => s + t.amount, 0);
    const totalExpenses = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const net = totalIncome - totalExpenses;

    // Largest transaction
    const largestExpense = expenses.reduce((max, t) => 
      Math.abs(t.amount) > Math.abs(max.amount) ? t : max, expenses[0]
    );
    const largestIncome = income.reduce((max, t) => 
      t.amount > max.amount ? t : max, income[0]
    );

    // Average transaction
    const avgExpense = totalExpenses / Math.max(1, expenses.length);
    const avgIncome = totalIncome / Math.max(1, income.length);

    // Savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Most active day
    const dayCounts: Record<string, number> = {};
    transactions.forEach(t => {
      const day = new Date(t.transaction_date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    // Most expensive month
    const monthTotals: Record<string, number> = {};
    expenses.forEach(t => {
      const month = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthTotals[month] = (monthTotals[month] || 0) + Math.abs(t.amount);
    });
    const mostExpensiveMonth = Object.entries(monthTotals).sort((a, b) => b[1] - a[1])[0];

    // Unique merchants
    const uniqueMerchants = new Set(transactions.map(t => t.description)).size;

    // Work percentage
    const workAmount = transactions.filter(t => t.is_work).reduce((s, t) => s + Math.abs(t.amount), 0);
    const totalAmount = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    const workPercentage = totalAmount > 0 ? (workAmount / totalAmount) * 100 : 0;

    // Monthly burn rate
    const months = new Set(transactions.map(t => t.mmm_yyyy)).size;
    const monthlyBurnRate = totalExpenses / Math.max(1, months);

    // Daily average spending
    const dates = new Set(transactions.filter(t => t.amount < 0).map(t => t.transaction_date));
    const dailyAvgSpend = totalExpenses / Math.max(1, dates.size);

    return {
      totalIncome,
      totalExpenses,
      net,
      largestExpense,
      largestIncome,
      avgExpense,
      avgIncome,
      savingsRate,
      mostActiveDay,
      mostExpensiveMonth,
      uniqueMerchants,
      workPercentage,
      monthlyBurnRate,
      dailyAvgSpend,
      totalTransactions: transactions.length,
      incomeCount: income.length,
      expenseCount: expenses.length,
      months
    };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (!stats) return null;

  const statCards = [
    {
      label: 'Savings Rate',
      value: `${stats.savingsRate.toFixed(1)}%`,
      icon: Percent,
      color: stats.savingsRate >= 20 ? 'text-emerald-600' : stats.savingsRate >= 0 ? 'text-amber-600' : 'text-rose-600',
      bg: stats.savingsRate >= 20 ? 'bg-emerald-50' : stats.savingsRate >= 0 ? 'bg-amber-50' : 'bg-rose-50',
      subtitle: stats.savingsRate >= 20 ? 'Great job!' : stats.savingsRate >= 0 ? 'Could improve' : 'Spending more than earning'
    },
    {
      label: 'Monthly Burn Rate',
      value: formatCurrency(stats.monthlyBurnRate),
      icon: Zap,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      subtitle: `Over ${stats.months} months`
    },
    {
      label: 'Daily Avg Spending',
      value: formatCurrency(stats.dailyAvgSpend),
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      subtitle: 'Per active day'
    },
    {
      label: 'Unique Merchants',
      value: stats.uniqueMerchants.toString(),
      icon: Target,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      subtitle: `${stats.totalTransactions} total transactions`
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <div key={stat.label} className={cn("p-4 rounded-xl", stat.bg)}>
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                  <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                </div>
                <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{stat.subtitle}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notable Transactions */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Notable Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Largest Expense */}
            {stats.largestExpense && (
              <div className="p-4 rounded-xl border bg-gradient-to-br from-rose-50 to-white dark:from-rose-950 dark:to-card">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownRight className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Largest Expense</span>
                </div>
                <p className="text-2xl font-bold text-rose-600">
                  {formatCurrency(Math.abs(stats.largestExpense.amount))}
                </p>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {stats.largestExpense.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(stats.largestExpense.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Largest Income */}
            {stats.largestIncome && (
              <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-card">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Largest Income</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stats.largestIncome.amount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {stats.largestIncome.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(stats.largestIncome.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}

            {/* Most Expensive Month */}
            {stats.mostExpensiveMonth && (
              <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-50 to-white dark:from-amber-950 dark:to-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Highest Spending Month</span>
                </div>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(stats.mostExpensiveMonth[1])}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.mostExpensiveMonth[0]}
                </p>
              </div>
            )}

            {/* Most Active Day */}
            {stats.mostActiveDay && (
              <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-card">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Most Active Day</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.mostActiveDay[0]}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.mostActiveDay[1]} transactions
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Averages */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Expense', value: formatCurrency(stats.avgExpense), color: 'text-rose-600' },
              { label: 'Avg Income', value: formatCurrency(stats.avgIncome), color: 'text-emerald-600' },
              { label: 'Work %', value: `${stats.workPercentage.toFixed(1)}%`, color: 'text-amber-600' },
              { label: 'Net', value: formatCurrency(stats.net), color: stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className={cn("text-xl font-bold", item.color)}>{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionStats;