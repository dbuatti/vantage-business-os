"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalculatedEntry } from '@/types/finance';
import { LineChart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface FinanceChartProps {
  entries: CalculatedEntry[];
}

const FinanceChart = ({ entries }: FinanceChartProps) => {
  const chartData = entries
    .slice()
    .reverse()
    .reduce((acc, entry) => {
      const dateKey = format(new Date(entry.date), 'MMM dd');
      const existing = acc.find(d => d.date === dateKey);
      
      if (existing) {
        if (entry.account === 'Savings') existing.savings = entry.amount;
        if (entry.account === 'Credit') existing.credit = entry.amount;
      } else {
        acc.push({
          date: dateKey,
          savings: entry.account === 'Savings' ? entry.amount : null,
          credit: entry.account === 'Credit' ? entry.amount : null,
        });
      }
      return acc;
    }, [] as { date: string; savings: number | null; credit: number | null }[])
    .slice(-12);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (chartData.length < 2) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border shadow-xl animate-slide-up opacity-0 stagger-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <LineChart className="w-5 h-5 text-primary" />
            </div>
            Progress Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-56">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Not enough data yet</p>
              <p className="text-sm text-muted-foreground/60">Add more entries to see your progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border shadow-xl animate-slide-up opacity-0 stagger-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <LineChart className="w-5 h-5 text-primary" />
          </div>
          Progress Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  fontSize: '13px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="savings" 
                name="Savings"
                stroke="#6366f1" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorSavings)" 
              />
              <Area 
                type="monotone" 
                dataKey="credit" 
                name="Credit"
                stroke="#f59e0b" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorCredit)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinanceChart;