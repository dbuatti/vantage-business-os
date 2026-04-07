"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Repeat, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  Calendar,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types/finance';

interface SubscriptionAuditProps {
  transactions: Transaction[];
}

const SubscriptionAudit = ({ transactions }: SubscriptionAuditProps) => {
  const auditData = useMemo(() => {
    const subs = transactions.filter(t => 
      t.category_1?.toLowerCase() === 'subscription' || 
      t.category_2?.toLowerCase() === 'subscription' ||
      t.amount < 0 && (
        t.description.toLowerCase().includes('sub ') || 
        t.description.toLowerCase().includes('monthly') ||
        t.description.toLowerCase().includes('membership')
      )
    );

    const groups: Record<string, Transaction[]> = {};
    subs.forEach(t => {
      const key = t.description.split('-')[0].trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    return Object.entries(groups)
      .map(([name, txns]) => {
        const sorted = [...txns].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
        const latestAmount = Math.abs(sorted[0].amount);
        const totalSpent = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
        
        // Determine frequency
        let frequency = 'Monthly';
        if (txns.length >= 2) {
          const d1 = new Date(sorted[0].transaction_date);
          const d2 = new Date(sorted[1].transaction_date);
          const diffDays = Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 300) frequency = 'Yearly';
          else if (diffDays < 10) frequency = 'Weekly';
        }

        return {
          name,
          latestAmount,
          totalSpent,
          count: txns.length,
          frequency,
          lastDate: sorted[0].transaction_date,
          isHighCost: latestAmount > 30
        };
      })
      .sort((a, b) => b.latestAmount - a.latestAmount);
  }, [transactions]);

  const totalMonthly = auditData.reduce((s, sub) => s + (sub.frequency === 'Monthly' ? sub.latestAmount : sub.latestAmount / 12), 0);

  if (auditData.length === 0) return null;

  return (
    <Card className="border-0 shadow-2xl bg-card overflow-hidden animate-slide-up">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Subscription Audit</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-wider">
                {auditData.length} active services detected
              </CardDescription>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">{formatCurrency(totalMonthly)}</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Est. Monthly Burn</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {auditData.map((sub) => (
            <div key={sub.name} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                  sub.isHighCost ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-primary/5 border-primary/10 text-primary"
                )}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">{sub.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-md uppercase font-black">
                      {sub.frequency}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Last: {new Date(sub.lastDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-base font-black tabular-nums">
                  {formatCurrency(sub.latestAmount)}
                </p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                  {formatCurrency(sub.totalSpent)} total
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 bg-primary/5 border-t">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold">Audit Recommendation</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You have <span className="font-bold text-foreground">{auditData.filter(s => s.isHighCost).length} high-cost subscriptions</span> (+$30/mo). 
                Cancelling just one could save you over <span className="font-bold text-emerald-600">$360 per year</span>.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionAudit;