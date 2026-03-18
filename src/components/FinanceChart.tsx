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
  // Prepare data for chart - group by date and get latest entry per account per date
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
    .slice(-12); // Last 12 data points

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
      <Card className="bg-white/50 backdrop-blur-sm border-indigo-100 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Progress Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Add more entries to see your progress chart</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/50 backdrop-blur-sm border-indigo-100 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <LineChart className="w-5 h-5" />
          Progress Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-sm font-medium">{value}</span>}
              />
              <Area 
                type="monotone" 
                dataKey="savings" 
                name="Savings"
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSavings)" 
              />
              <Area 
                type="monotone" 
                dataKey="credit" 
                name="Credit"
                stroke="#f59e0b" 
                strokeWidth={2}
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