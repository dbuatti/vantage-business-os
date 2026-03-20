"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CalculatedEntry } from '@/types/finance';
import { Wallet, CreditCard, TrendingUp, TrendingDown, BarChart3, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FinanceSummaryProps {
  entries: CalculatedEntry[];
}

const FinanceSummary = ({ entries }: FinanceSummaryProps) => {
  const latestSavings = entries.find(e => e.account === 'Savings')?.amount || 0;
  const latestCredit = entries.find(e => e.account === 'Credit')?.amount || 0;
  const totalNet = latestSavings + latestCredit;

  const savingsEntries = entries.filter(e => e.account === 'Savings');
  const creditEntries = entries.filter(e => e.account === 'Credit');
  
  const savingsChange = savingsEntries.length >= 2 
    ? savingsEntries[0].amount - savingsEntries[1].amount 
    : 0;
  const creditChange = creditEntries.length >= 2 
    ? creditEntries[0].amount - creditEntries[1].amount 
    : 0;
  const netChange = savingsChange + creditChange;

  const recentSavings = savingsEntries.slice(0, 4);
  const avgSavingsChange = recentSavings.length >= 2
    ? recentSavings.reduce((sum, e, i) => {
        if (i === 0) return sum;
        return sum + (e.amount - recentSavings[i - 1].amount);
      }, 0) / (recentSavings.length - 1)
    : 0;

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

  const cards = [
    {
      title: 'Current Savings',
      value: formatCurrency(latestSavings),
      change: savingsChange,
      icon: Wallet,
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      iconBg: 'bg-white/20',
      description: 'Total liquid assets across all savings and checking accounts.'
    },
    {
      title: 'Credit Balance',
      value: formatCurrency(latestCredit),
      change: creditChange,
      icon: CreditCard,
      gradient: 'from-amber-400 via-amber-500 to-orange-500',
      iconBg: 'bg-white/20',
      description: 'Total outstanding debt on credit cards and short-term loans.'
    },
    {
      title: 'Net Worth',
      value: formatCurrency(totalNet),
      change: netChange,
      icon: TrendingUp,
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
      iconBg: 'bg-white/20',
      description: 'Your total financial position (Savings minus Credit).'
    },
    {
      title: 'Avg Weekly Change',
      value: formatChange(avgSavingsChange),
      change: avgSavingsChange,
      icon: BarChart3,
      gradient: 'from-emerald-400 via-emerald-500 to-teal-500',
      iconBg: 'bg-white/20',
      subtitle: `Last ${Math.min(recentSavings.length, 4)} entries`,
      description: 'The average amount your savings change each week based on recent logs.'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <Card 
          key={card.title}
          className={cn(
            "relative overflow-hidden border-0 shadow-lg animate-slide-up opacity-0",
            `stagger-${i + 1}`
          )}
        >
          <div className={cn("absolute inset-0 bg-gradient-to-br", card.gradient)} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="relative p-5 text-white">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white/80">{card.title}</p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="opacity-60 hover:opacity-100 transition-opacity">
                          <Info className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-white text-foreground border-0 shadow-xl rounded-xl p-3 max-w-[200px]">
                        <p className="text-xs font-medium leading-relaxed">{card.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
              </div>
              <div className={cn("p-2.5 rounded-xl", card.iconBg)}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {card.change !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  card.change > 0 ? "bg-white/20 text-white" : "bg-black/20 text-white"
                )}>
                  {card.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatChange(card.change)} this week
                </span>
              )}
              {card.subtitle && (
                <span className="text-xs text-white/60">{card.subtitle}</span>
              )}
              {card.change === 0 && !card.subtitle && (
                <span className="text-xs text-white/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Add entries to track
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FinanceSummary;