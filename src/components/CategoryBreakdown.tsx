"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  category_2: string;
  is_work: boolean;
  mmm_yyyy: string;
}

interface CategoryBreakdownProps {
  transactions: Transaction[];
}

interface CategoryData {
  name: string;
  total: number;
  count: number;
  percentage: number;
  avgAmount: number;
  monthlyAvg: number;
  trend: 'up' | 'down' | 'stable';
  isWork: boolean;
  subcategories: SubcategoryData[];
  topMerchants: { name: string; total: number }[];
}

interface SubcategoryData {
  name: string;
  total: number;
  count: number;
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
  '#a855f7', '#e11d48', '#0ea5e9', '#84cc16', '#d946ef',
];

const CategoryBreakdown = ({ transactions }: CategoryBreakdownProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'expenses' | 'income'>('expenses');

  const categoryData = useMemo(() => {
    const filtered = transactions.filter(t => 
      viewMode === 'expenses' ? t.amount < 0 : t.amount > 0
    );

    const totalAmount = filtered.reduce((s, t) => s + Math.abs(t.amount), 0);

    const categories: Record<string, Transaction[]> = {};
    filtered.forEach(t => {
      const cat = t.category_1 || 'Uncategorized';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(t);
    });

    const result: CategoryData[] = Object.entries(categories).map(([name, txns]) => {
      const total = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
      const count = txns.length;

      // Subcategories
      const subcats: Record<string, { total: number; count: number }> = {};
      txns.forEach(t => {
        const sub = t.category_2 || 'Other';
        if (!subcats[sub]) subcats[sub] = { total: 0, count: 0 };
        subcats[sub].total += Math.abs(t.amount);
        subcats[sub].count++;
      });

      // Top merchants
      const merchants: Record<string, number> = {};
      txns.forEach(t => {
        merchants[t.description] = (merchants[t.description] || 0) + Math.abs(t.amount);
      });

      // Monthly average
      const months = new Set(txns.map(t => t.mmm_yyyy));
      const monthlyAvg = total / Math.max(1, months.size);

      // Trend calculation
      const sorted = [...txns].sort((a, b) => 
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
      );
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (sorted.length >= 6) {
        const half = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, half).reduce((s, t) => s + Math.abs(t.amount), 0) / half;
        const secondHalf = sorted.slice(half).reduce((s, t) => s + Math.abs(t.amount), 0) / (sorted.length - half);
        if (secondHalf > firstHalf * 1.15) trend = 'up';
        else if (secondHalf < firstHalf * 0.85) trend = 'down';
      }

      return {
        name,
        total,
        count,
        percentage: totalAmount > 0 ? (total / totalAmount) * 100 : 0,
        avgAmount: total / count,
        monthlyAvg,
        trend,
        isWork: txns.some(t => t.is_work),
        subcategories: Object.entries(subcats)
          .map(([subName, data]) => ({ name: subName, ...data }))
          .sort((a, b) => b.total - a.total),
        topMerchants: Object.entries(merchants)
          .map(([mName, mTotal]) => ({ name: mName, total: mTotal }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 3)
      };
    }).sort((a, b) => b.total - a.total);

    return { categories: result, totalAmount };
  }, [transactions, viewMode]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (categoryData.categories.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Category Breakdown
          </CardTitle>
          <CardDescription>No data to display</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              Category Breakdown
            </CardTitle>
            <CardDescription>
              {categoryData.categories.length} categories · {formatCurrency(categoryData.totalAmount)} total
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <Button
              variant={viewMode === 'expenses' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('expenses')}
              className="rounded-lg h-7 text-xs"
            >
              <ArrowDownRight className="w-3 h-3 mr-1" />
              Expenses
            </Button>
            <Button
              variant={viewMode === 'income' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('income')}
              className="rounded-lg h-7 text-xs"
            >
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Income
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categoryData.categories.map((cat, i) => {
            const isExpanded = expandedCategory === cat.name;
            const color = COLORS[i % COLORS.length];

            return (
              <div key={cat.name} className="rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: color }} 
                    />
                    <span className="font-medium text-sm truncate">{cat.name}</span>
                    {cat.isWork && (
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 rounded-md shrink-0">
                        Work
                      </Badge>
                    )}
                    {cat.trend === 'up' && (
                      <TrendingUp className="w-3 h-3 text-rose-500 shrink-0" />
                    )}
                    {cat.trend === 'down' && (
                      <TrendingDown className="w-3 h-3 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-sm tabular-nums">{formatCurrency(cat.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{cat.count} txns</p>
                    </div>
                    <div className="w-16">
                      <Progress 
                        value={cat.percentage} 
                        className="h-1.5"
                        style={{ 
                          '--progress-foreground': color 
                        } as React.CSSProperties}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right font-medium">
                      {cat.percentage.toFixed(1)}%
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 animate-fade-in border-t bg-muted/20">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 pt-3">
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-[10px] text-muted-foreground">Avg/Transaction</p>
                        <p className="font-bold text-sm">{formatCurrency(cat.avgAmount)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-[10px] text-muted-foreground">Monthly Avg</p>
                        <p className="font-bold text-sm">{formatCurrency(cat.monthlyAvg)}</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-background">
                        <p className="text-[10px] text-muted-foreground">Transactions</p>
                        <p className="font-bold text-sm">{cat.count}</p>
                      </div>
                    </div>

                    {/* Subcategories */}
                    {cat.subcategories.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Subcategories
                        </p>
                        {cat.subcategories.map((sub) => (
                          <div key={sub.name} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs truncate">{sub.name}</span>
                                <span className="text-xs font-medium tabular-nums">{formatCurrency(sub.total)}</span>
                              </div>
                              <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${(sub.total / cat.total) * 100}%`,
                                    backgroundColor: color,
                                    opacity: 0.7
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground w-6 text-right">{sub.count}×</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Top Merchants */}
                    {cat.topMerchants.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Top Merchants
                        </p>
                        {cat.topMerchants.map((merchant, j) => (
                          <div key={merchant.name} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              {j + 1}. {merchant.name}
                            </span>
                            <span className="font-medium tabular-nums">{formatCurrency(merchant.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdown;