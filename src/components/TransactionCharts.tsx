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

interface TransactionChartsProps {
  transactions: Transaction[];
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
];

const TransactionCharts = ({ transactions }: TransactionChartsProps) => {
  const monthlyTrend = React.useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number; net: number }> = {};
    
    transactions.forEach(t => {
      const monthKey = t.mmm_yyyy || new Date(t.transaction_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, income: 0, expenses: 0, net: 0 };
      }
      if (t.amount > 0) months[monthKey].income += t.amount;
      else months[monthKey].expenses += Math.abs(t.amount);
      months[monthKey].net = months[monthKey].income - months[monthKey].expenses;
    });

    return Object.values(months)
      .sort((a, b) => {
        try {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateA.getTime() - dateB.getTime();
        } catch { return 0; }
      });
  }, [transactions]);

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
    transactions.filter(t => t.amount < 0).forEach(t => {
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
    const work = transactions.filter(t => t.is_work).reduce((sum, t) => sum + t.amount, 0);
    const personal = transactions.filter(t => !t.is_work).reduce((sum, t) => sum + t.amount, 0);
    return [
      { name: 'Work', value: Math.abs(work), color: '#f59e0b' },
      { name: 'Personal', value: Math.abs(personal), color: '#6366f1' },
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

      {/* Three Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChart className="w-5 h-5 text-primary" />
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" labelLine={false}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {categoryData.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground truncate max-w-[120px]">{cat.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              By Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                    labelStyle={tooltipLabelStyle}
                  />
                  <Bar dataKey="total" name="Spending" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                Highest spending on <span className="font-semibold text-foreground">
                  {dayOfWeekData.reduce((max, d) => d.total > max.total ? d : max, dayOfWeekData[0]).day}
              </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Work vs Personal */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
              Work vs Personal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workPersonalData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={70} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    contentStyle={tooltipContentStyle}
                    itemStyle={tooltipItemStyle}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {workPersonalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {workPersonalData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      {topMerchants.length > 0 && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Store className="w-5 h-5 text-primary" />
              Top Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topMerchants.map((merchant, i) => {
                const maxTotal = topMerchants[0].total;
                const percentage = (merchant.total / maxTotal) * 100;
                return (
                  <div key={merchant.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right font-medium">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{merchant.name}</span>
                        <span className="text-sm font-bold tabular-nums ml-2">{formatCurrency(merchant.total)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{merchant.count}×</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TransactionCharts;