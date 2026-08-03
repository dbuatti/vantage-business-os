"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat, Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeMerchantName } from '@/utils/subscriptions';

interface Transaction {
  id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  is_work: boolean;
}

interface RecurringTransactionsProps {
  transactions: Transaction[];
}

interface RecurringGroup {
  description: string;
  category: string;
  amounts: number[];
  dates: string[];
  frequency: string;
  avgAmount: number;
  isWork: boolean;
  count: number;
}

const RecurringTransactions = ({ transactions }: RecurringTransactionsProps) => {
  const recurringGroups = useMemo(() => {
    // Group by normalized description
    const groups: Record<string, Transaction[]> = {};

    transactions.forEach(t => {
      // Normalize description: strip receipt/card/reference tokens and embedded
      // dates so the same merchant with a different random suffix each charge
      // (e.g. "Dropbox 7MJJBCZ3TM9M" vs "Dropbox GB9DTD2CGLT7") collapses into
      // one recurring group instead of being missed entirely.
      const normalized = normalizeMerchantName(t.description).toLowerCase();

      if (normalized.length < 3) return;

      if (!groups[normalized]) groups[normalized] = [];
      groups[normalized].push(t);
    });

    // Filter to recurring (3+ occurrences)
    const recurring: RecurringGroup[] = Object.entries(groups)
      .filter(([, txns]) => txns.length >= 3)
      .map(([, txns]) => {
        const sorted = txns.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
        const amounts = sorted.map(t => t.amount);
        const dates = sorted.map(t => t.transaction_date);

        // Calculate average frequency
        let avgDays = 0;
        if (dates.length >= 2) {
          const gaps = [];
          for (let i = 1; i < dates.length; i++) {
            gaps.push((new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / (1000 * 60 * 60 * 24));
          }
          avgDays = gaps.reduce((s, g) => s + g, 0) / gaps.length;
        }

        let frequency = 'Irregular';
        if (avgDays >= 25 && avgDays <= 35) frequency = 'Monthly';
        else if (avgDays >= 12 && avgDays <= 16) frequency = 'Bi-weekly';
        else if (avgDays >= 5 && avgDays <= 9) frequency = 'Weekly';
        else if (avgDays >= 85 && avgDays <= 95) frequency = 'Quarterly';
        else if (avgDays >= 360 && avgDays <= 370) frequency = 'Yearly';

        return {
          description: normalizeMerchantName(sorted[sorted.length - 1].description),
          category: sorted[sorted.length - 1].category_1,
          amounts,
          dates,
          frequency,
          avgAmount: amounts.reduce((s, a) => s + a, 0) / amounts.length,
          isWork: sorted.some(t => t.is_work),
          count: txns.length
        };
      })
      .sort((a, b) => Math.abs(b.avgAmount) - Math.abs(a.avgAmount));

    return recurring;
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(val);
  };

  const formatCurrencyAbs = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(val));
  };

  if (recurringGroups.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Recurring Transactions
          </CardTitle>
          <CardDescription>Need more data to detect patterns</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Repeat className="w-10 h-10 mx-auto opacity-20 mb-2" />
          <p className="font-medium">No recurring patterns detected yet</p>
          <p className="text-sm">Import more transactions to see recurring spending</p>
        </CardContent>
      </Card>
    );
  }

  const totalMonthlyRecurring = recurringGroups
    .filter(g => g.frequency === 'Monthly')
    .reduce((s, g) => s + g.avgAmount, 0);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Repeat className="w-5 h-5 text-primary" />
              Recurring Transactions
            </CardTitle>
            <CardDescription>
              {recurringGroups.length} recurring pattern{recurringGroups.length > 1 ? 's' : ''} detected
            </CardDescription>
          </div>
          {totalMonthlyRecurring !== 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Monthly recurring</p>
              <p className={cn(
                "font-bold text-lg",
                totalMonthlyRecurring < 0 ? "text-danger" : "text-profit"
              )}>
                {formatCurrency(totalMonthlyRecurring)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recurringGroups.map((group, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate" title={group.description}>
                      {group.description}
                    </p>
                    {group.isWork && (
                      <Badge variant="outline" className="text-[10px] bg-warning-bg text-warning border-warning-border rounded-lg shrink-0">
                        Work
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] rounded-lg bg-primary/5 text-primary border-primary/10">
                      {group.category || 'Uncategorized'}
                    </Badge>
                    <span>·</span>
                    <span>{group.count} occurrences</span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className={cn(
                    "font-bold",
                    group.avgAmount < 0 ? "text-danger" : "text-profit"
                  )}>
                    {formatCurrencyAbs(group.avgAmount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">avg per txn</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <Badge className={cn(
                  "rounded-lg text-[10px]",
                  group.frequency === 'Monthly' ? "bg-info-bg text-info" :
                  group.frequency === 'Weekly' ? "bg-purple-100 text-purple-700" :
                  group.frequency === 'Bi-weekly' ? "bg-indigo-100 text-indigo-700" :
                  group.frequency === 'Quarterly' ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  <Calendar className="w-2.5 h-2.5 mr-1" />
                  {group.frequency}
                </Badge>
                <div className="flex-1 flex items-center gap-1">
                  {group.amounts.slice(-6).map((amount, j) => (
                    <div
                      key={j}
                      className={cn(
                        "h-4 flex-1 rounded-sm",
                        amount < 0 ? "bg-rose-200" : "bg-emerald-200"
                      )}
                      title={formatCurrency(amount)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurringTransactions;