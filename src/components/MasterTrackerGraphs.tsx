"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Legend,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { format, eachMonthOfInterval, startOfYear, endOfYear, isSameMonth, parseISO } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { TrendingUp, BarChart3, Activity, Target } from 'lucide-react';

interface MasterTrackerGraphsProps {
  transactions: any[];
  budgets: any[];
  categoryGroups: any[];
  year: number;
}

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', color: '#6366f1' },
  { name: 'Flexible Essentials', color: '#f59e0b' },
  { name: 'Sustenance', color: '#10b981' },
  { name: 'Wellness & Growth', color: '#8b5cf6' },
  { name: 'Lifestyle & Discretionary', color: '#ef4444' },
];

const MasterTrackerGraphs = ({ transactions, budgets, categoryGroups, year }: MasterTrackerGraphsProps) => {
  const catToGroup = useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(cg => { map[cg.category_name] = cg.group_name; });
    return map;
  }, [categoryGroups]);

  const months = useMemo(() => {
    return eachMonthOfInterval({
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1))
    });
  }, [year]);

  const chartData = useMemo(() => {
    return months.map(month => {
      const monthTxns = transactions.filter(t => isSameMonth(parseISO(t.transaction_date), month));
      const data: any = { name: format(month, 'MMM') };
      
      EXPENSE_GROUPS.forEach(group => {
        data[group.name] = monthTxns
          .filter(t => catToGroup[t.category_1] === group.name)
          .reduce((s, t) => s + Math.abs(t.amount), 0);
      });

      data.total = EXPENSE_GROUPS.reduce((s, g) => s + data[g.name], 0);
      return data;
    });
  }, [transactions, months, catToGroup]);

  const budgetComparisonData = useMemo(() => {
    return EXPENSE_GROUPS.map(group => {
      const actual = transactions
        .filter(t => catToGroup[t.category_1] === group.name)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      
      const budget = budgets
        .filter(b => b.category_name === group.name && (b.month === 0 || b.month === null))
        .reduce((s, b) => s + b.amount, 0);

      return {
        name: group.name,
        actual,
        budget,
        delta: budget - actual,
        percent: budget > 0 ? (actual / budget) * 100 : 0
      };
    });
  }, [transactions, budgets, catToGroup]);

  const cumulativeData = useMemo(() => {
    let runningTotal = 0;
    const totalAnnualBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const monthlyBudgetStep = totalAnnualBudget / 12;

    return months.map((month, i) => {
      const monthTotal = transactions
        .filter(t => isSameMonth(parseISO(t.transaction_date), month))
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      
      runningTotal += monthTotal;
      
      return {
        name: format(month, 'MMM'),
        spent: Math.round(runningTotal),
        target: Math.round(monthlyBudgetStep * (i + 1))
      };
    });
  }, [transactions, months, budgets]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-xl shadow-2xl p-4 space-y-2">
          <p className="font-black text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs font-bold">{entry.name}</span>
                </div>
                <span className="text-xs font-black tabular-nums">{formatCurrency(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Group Spending Trend */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black">Group Spending Trend</CardTitle>
                <CardDescription>Monthly evolution of expense groups</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    {EXPENSE_GROUPS.map((group, i) => (
                      <linearGradient key={i} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={group.color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={group.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                  {EXPENSE_GROUPS.map((group, i) => (
                    <Area
                      key={group.name}
                      type="monotone"
                      dataKey={group.name}
                      stackId="1"
                      stroke={group.color}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#color${i})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Budget Adherence */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-black">Budget Adherence</CardTitle>
                <CardDescription>Actual spending vs. annual targets</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetComparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                  <Bar dataKey="budget" name="Target" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]} barSize={20}>
                    {budgetComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.actual > entry.budget ? '#ef4444' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Burn */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black">Cumulative Burn Velocity</CardTitle>
              <CardDescription>Tracking total YTD spend against linear budget trajectory</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  name="Budget Path" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5" 
                  strokeWidth={2} 
                  dot={false} 
                />
                <Line 
                  type="monotone" 
                  dataKey="spent" 
                  name="Actual Spend" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterTrackerGraphs;