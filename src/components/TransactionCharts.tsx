"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart, TrendingUp, Store, Calendar } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  amount: number;
  category_1: string;
  is_work: boolean;
  mmm_yyyy: string;
  description: string;
}

interface CategoryGroup {
  category_name: string;
  group_name: string;
}

interface TransactionChartsProps {
  transactions: Transaction[];
  categoryGroups: CategoryGroup[];
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
];

const INCOME_GROUPS = [
  '💰 Regular Income',
  '🎵 Music Performance',
  '🎹 Music Services',
  '📋 Other Income'
];

const TransactionCharts = ({ transactions, categoryGroups }: TransactionChartsProps) => {
  const monthlyTrend = React.useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number; net: number }> = {};
    
    // Create a map for quick lookup
    const catToGroup: Record<string, string> = {};
    categoryGroups.forEach(cg => {
      catToGroup[cg.category_name] = cg.group_name;
    });

    transactions.forEach(t => {
      const monthKey = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, income: 0, expenses: 0, net: 0 };
      }

      const groupName = catToGroup[t.category_1];
      const isIncomeGroup = groupName && INCOME_GROUPS.includes(groupName);
      
      // Use category group to determine if it's income or expense
      // Fallback to amount sign if category is unmapped
      if (isIncomeGroup || (!groupName && t.amount > 0)) {
        months[monthKey].income += Math.abs(t.amount);
      } else {
        months[monthKey].expenses += Math.abs(t.amount);
      }
      
      months[monthKey].net = months[monthKey].income - months[monthKey].expenses;
    });

    return Object.values(months)
      .sort((a, b) => {
        try {
          const parseMonth = (s: string) => {
            const parts = s.split(' ');
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIdx = monthNames.indexOf(parts[0].toLowerCase().substring(0, 3));
            return new Date(parseInt(parts[1]), monthIdx);
          };
          return parseMonth(a.month).getTime() - parseMonth(b.month).getTime();
        } catch { return 0; }
      });
  }, [transactions, categoryGroups]);

  const categoryData = React.useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category_1 || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions]);

  const topMerchants = React.useMemo(() => {
    const merchants: Record<string, { total: number; count: number }> = {};
    // Filter out 'Account' category transactions as they are internal transfers
    transactions.filter(t => t.amount < 0 && t.category_1 !== 'Account').forEach(t => {
      const name = t.description.length > 30 ? t.description.substring(0, 30) + '...' : t.description;
      if (!merchants[name]) merchants[name] = { total: 0, count: 0 };
      merchants[name].total += Math.abs(t.amount);
      merchants[name].count++;
    });
    return Object.entries(merchants)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [transactions]);

  const dayOfWeekData = React.useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals = days.map(d => ({ day: d, total: 0, count: 0 }));
    
    transactions.filter(t => t.amount < 0).forEach(t => {
      const dayIndex = new Date(t.transaction_date).getDay();
      dayTotals[dayIndex].total += Math.abs(t.amount);
      dayTotals[dayIndex].count++;
    });

    return dayTotals.map(d => ({
      ...d,
      average: d.count > 0 ? d.total / d.count : 0
    }));
  }, [transactions]);

  const workPersonalData = React.useMemo(() => {
    const work = transactions.filter(t => t.is_work).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const personal = transactions.filter(t => !t.is_work).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return [
      { name: 'Work', value: work, color: '#f59e0b' },
      { name: 'Personal', value: personal, color: '#6366f1' },
    ];
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (transactions.length < 2) return null;

  const tooltipContentStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    fontSize: '13px',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  };

  const tooltipItemStyle = {
    color: 'hsl(var(--foreground))',
  };

  const tooltipLabelStyle = {
    color: 'hsl(var(--muted-foreground))',
    fontWeight: 'bold',
    marginBottom: '4px',
  };

  return (
    <div className="space-y-6">
      {/* Monthly Trend - Full Width */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monthly Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)} 
                  contentStyle={tooltipContentStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionCharts;