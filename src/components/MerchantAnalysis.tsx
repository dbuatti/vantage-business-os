"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, TrendingUp, TrendingDown, Repeat, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  is_work: boolean;
}

interface MerchantAnalysisProps {
  transactions: Transaction[];
}

interface MerchantData {
  name: string;
  totalSpent: number;
  totalReceived: number;
  transactionCount: number;
  avgAmount: number;
  firstSeen: string;
  lastSeen: string;
  category: string;
  isWork: boolean;
  monthlyAvg: number;
  trend: 'up' | 'down' | 'stable';
}

const MerchantAnalysis = ({ transactions }: MerchantAnalysisProps) => {
  const merchants = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    transactions.forEach(t => {
      const key = t.description.trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    const result: MerchantData[] = Object.entries(groups)
      .map(([, txns]) => {
        const sorted = txns.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
        const totalSpent = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
        const totalReceived = txns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
        const amounts = txns.map(t => t.amount);

        // Calculate monthly average
        const firstDate = new Date(sorted[0].transaction_date);
        const lastDate = new Date(sorted[sorted.length - 1].transaction_date);
        const monthsDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
        const monthlyAvg = (totalSpent - totalReceived) / monthsDiff;

        // Calculate trend (compare last 3 vs first 3)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (sorted.length >= 6) {
          const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
          const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
          const firstAvg = firstHalf.reduce((s, t) => s + Math.abs(t.amount), 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((s, t) => s + Math.abs(t.amount), 0) / secondHalf.length;
          if (secondAvg > firstAvg * 1.15) trend = 'up';
          else if (secondAvg < firstAvg * 0.85) trend = 'down';
        }

        return {
          name: sorted[sorted.length - 1].description,
          totalSpent,
          totalReceived,
          transactionCount: txns.length,
          avgAmount: amounts.reduce((s, a) => s + a, 0) / amounts.length,
          firstSeen: sorted[0].transaction_date,
          lastSeen: sorted[sorted.length - 1].transaction_date,
          category: sorted[sorted.length - 1].category_1,
          isWork: txns.some(t => t.is_work),
          monthlyAvg,
          trend
        };
      })
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 20);

    return result;
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (merchants.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            Merchant Analysis
          </CardTitle>
          <CardDescription>Import transactions to see merchant breakdown</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Store className="w-10 h-10 mx-auto opacity-20 mb-2" />
          <p className="font-medium">No merchant data yet</p>
        </CardContent>
      </Card>
    );
  }

  const totalTopMerchants = merchants.reduce((s, m) => s + m.totalSpent, 0);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="w-5 h-5 text-primary" />
              Top Merchants
            </CardTitle>
            <CardDescription>
              {merchants.length} most frequent merchants by transaction count
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Top {merchants.length} total</p>
            <p className="font-bold text-lg text-rose-600">{formatCurrency(totalTopMerchants)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {merchants.map((merchant, i) => {
            const maxCount = merchants[0].transactionCount;
            const barWidth = (merchant.transactionCount / maxCount) * 100;
            const netAmount = merchant.totalReceived - merchant.totalSpent;

            return (
              <div
                key={merchant.name}
                className="group p-3 rounded-xl border hover:bg-muted/30 transition-all hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-5 text-right font-bold shrink-0 pt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate" title={merchant.name}>
                          {merchant.name}
                        </p>
                        {merchant.isWork && (
                          <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 rounded-md shrink-0">
                            Work
                          </Badge>
                        )}
                        {merchant.trend === 'up' && (
                          <TrendingUp className="w-3 h-3 text-rose-500 shrink-0" />
                        )}
                        {merchant.trend === 'down' && (
                          <TrendingDown className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{merchant.transactionCount}×</span>
                        <span>·</span>
                        <span>{merchant.category || 'Uncategorized'}</span>
                        <span>·</span>
                        <span>Avg {formatCurrency(Math.abs(merchant.avgAmount))}</span>
                      </div>
                      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            merchant.totalSpent > merchant.totalReceived
                              ? "bg-gradient-to-r from-rose-400 to-rose-500"
                              : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          )}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn(
                      "font-bold text-sm",
                      netAmount >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {netAmount >= 0 ? '+' : ''}{formatCurrency(netAmount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ~{formatCurrency(Math.abs(merchant.monthlyAvg))}/mo
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MerchantAnalysis;