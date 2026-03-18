"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  amount: number;
}

interface SpendingHeatmapProps {
  transactions: Transaction[];
}

const SpendingHeatmap = ({ transactions }: SpendingHeatmapProps) => {
  const { weeks, maxSpending, monthLabels } = useMemo(() => {
    const dailySpending: Record<string, number> = {};
    
    transactions
      .filter(t => t.amount < 0)
      .forEach(t => {
        const date = t.transaction_date;
        dailySpending[date] = (dailySpending[date] || 0) + Math.abs(t.amount);
      });

    const dates = Object.keys(dailySpending).sort();
    if (dates.length === 0) return { weeks: [], maxSpending: 0, monthLabels: [] };

    const minDate = new Date(dates[0]);
    const maxDate = new Date(dates[dates.length - 1]);

    // Align to Sunday
    const start = new Date(minDate);
    start.setDate(start.getDate() - start.getDay());

    const end = new Date(maxDate);
    end.setDate(end.getDate() + (6 - end.getDay()));

    const maxSpending = Math.max(...Object.values(dailySpending), 1);

    // Build weeks
    const weeks: { date: string; amount: number; dayOfWeek: number }[][] = [];
    const monthLabels: { week: number; label: string }[] = [];
    let current = new Date(start);
    let weekIndex = 0;
    let lastMonth = -1;

    while (current <= end) {
      const week: { date: string; amount: number; dayOfWeek: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().split('T')[0];
        week.push({
          date: dateStr,
          amount: dailySpending[dateStr] || 0,
          dayOfWeek: current.getDay()
        });

        // Track month changes
        if (current.getDay() === 0 && current.getMonth() !== lastMonth) {
          monthLabels.push({
            week: weekIndex,
            label: current.toLocaleDateString('en-US', { month: 'short' })
          });
          lastMonth = current.getMonth();
        }

        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      weekIndex++;
    }

    return { weeks, maxSpending, monthLabels };
  }, [transactions]);

  const getIntensity = (amount: number): string => {
    if (amount === 0) return 'bg-muted/50';
    const ratio = amount / maxSpending;
    if (ratio < 0.2) return 'bg-emerald-100 dark:bg-emerald-900/40';
    if (ratio < 0.4) return 'bg-emerald-200 dark:bg-emerald-800/50';
    if (ratio < 0.6) return 'bg-emerald-300 dark:bg-emerald-700/60';
    if (ratio < 0.8) return 'bg-emerald-400 dark:bg-emerald-600/70';
    return 'bg-emerald-500 dark:bg-emerald-500/80';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (weeks.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Spending Heatmap
          </CardTitle>
          <CardDescription>Import transactions to see spending patterns</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalSpending = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const activeDays = Object.keys(
    transactions.filter(t => t.amount < 0).reduce((acc, t) => {
      acc[t.transaction_date] = true;
      return acc;
    }, {} as Record<string, boolean>)
  ).length;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="w-5 h-5 text-primary" />
              Spending Heatmap
            </CardTitle>
            <CardDescription>
              {activeDays} active spending days · {formatCurrency(totalSpending)} total
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex mb-1 ml-8">
              {monthLabels.map((m, i) => (
                <div
                  key={i}
                  className="text-[10px] text-muted-foreground font-medium"
                  style={{ marginLeft: `${(m.week - (monthLabels[i - 1]?.week || 0)) * 14}px` }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            <div className="flex gap-0.5">
              {/* Day labels */}
              <div className="flex flex-col gap-0.5 mr-1">
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((day, i) => (
                  <div key={i} className="h-3 text-[9px] text-muted-foreground flex items-center w-6">
                    {day}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={cn(
                        "w-3 h-3 rounded-sm transition-all hover:ring-1 hover:ring-primary/50 cursor-default",
                        getIntensity(day.amount)
                      )}
                      title={day.amount > 0 ? `${day.date}: ${formatCurrency(day.amount)}` : day.date}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-3">
              <span className="text-[10px] text-muted-foreground">Less</span>
              <div className="w-3 h-3 rounded-sm bg-muted/50" />
              <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40" />
              <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-800/50" />
              <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-700/60" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600/70" />
              <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500/80" />
              <span className="text-[10px] text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingHeatmap;