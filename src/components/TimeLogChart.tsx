"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface TimeLogChartProps {
  data: Array<{ day: string; hours: number }>;
}

const TimeLogChart = ({ data }: TimeLogChartProps) => {
  const totalHours = data.reduce((s, d) => s + d.hours, 0);
  const avgHours = totalHours / data.length;

  return (
    <Card className="border-0 shadow-xl bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Weekly Output
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">{totalHours.toFixed(1)}h</p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total This Week</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }}
                itemStyle={{ fontWeight: 700, color: 'hsl(var(--primary))' }}
              />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.hours >= avgHours ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeLogChart;