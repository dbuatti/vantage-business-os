"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart, TrendingUp, Store, Calendar, Layers } from 'lucide-react';
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

const EXPENSE_GROUPS = [
  'Fixed Essentials',
  'Flexible Essentials',
  'Sustenance',
  'Wellness & Growth',
  'Lifestyle & Discretionary'
];

const TransactionCharts = ({ transactions, categoryGroups }: TransactionChartsProps) => {
  const catToGroup = React.useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(cg => {
      map[cg.category_name] = cg.group_name;
    });
    return map;
  }, [categoryGroups]);

  const monthlyTrend = React.useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number; net: number }> = {};
    
    transactions.forEach(t => {
      const monthKey = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, income: 0, expenses: 0, net: 0 };
      }

      const groupName = catToGroup[t.category_1];
      const isIncomeGroup = groupName && INCOME_GROUPS.includes(groupName);
      
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
  }, [transactions, catToGroup]);

  const groupTrendData = React.useMemo(() => {
    const months: Record<string, any> = {};
    
    transactions.filter(t => t.amount < 0).forEach(t => {
      const monthKey = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey };
        EXPENSE_GROUPS.forEach(g => { months[monthKey][g] = 0; });
        months[monthKey]['Other'] = 0;
      }

      const groupName = catToGroup[t.category_1] || 'Other';
      if (months[monthKey][groupName] !== undefined) {
        months[monthKey][groupName] += Math.abs(t.amount);
      } else {
        months[monthKey]['Other'] += Math.abs(t.amount);
      }
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
      })
      .slice(-6); // Last 6 months
  }, [transactions, catToGroup]);

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

  return (
    <div className="space-y-6">
      {/* Monthly Trend */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Cash Flow Trend
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
                />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpenses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Group Spending Trend */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="w-5 h-5 text-primary" />
            Group Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)} 
                  contentStyle={tooltipContentStyle}
                />
                <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} />
                {EXPENSE_GROUPS.map((group, i) => (
                  <Bar key={group} dataKey={group} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === EXPENSE_GROUPS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
                <Bar dataKey="Other" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionCharts;