"use client";

import React from 'react';
import { CalculatedEntry } from '@/types/finance';
import { Calendar, Hash, TrendingUp, Percent } from 'lucide-react';
import { format } from 'date-fns';

interface QuickStatsProps {
  entries: CalculatedEntry[];
}

const QuickStats = ({ entries }: QuickStatsProps) => {
  if (entries.length === 0) return null;

  const sortedDates = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const oldestDate = sortedDates[0]?.date;
  const newestDate = sortedDates[sortedDates.length - 1]?.date;
  
  const totalPositive = entries.filter(e => e.difference > 0).length;
  const totalNegative = entries.filter(e => e.difference < 0).length;
  const positiveRate = entries.length > 1 
    ? Math.round((totalPositive / (totalPositive + totalNegative)) * 100) 
    : 0;

  const stats = [
    { icon: Hash, label: `${entries.length} entries`, show: true },
    { icon: Calendar, label: `${format(new Date(oldestDate), 'MMM yy')} — ${format(new Date(newestDate), 'MMM yy')}`, show: true },
    { icon: Percent, label: `${positiveRate}% positive`, show: entries.length > 1 },
  ].filter(s => s.show);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stats.map(({ icon: Icon, label }, i) => (
        <div 
          key={i} 
          className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full"
        >
          <Icon className="w-3 h-3 text-primary" />
          <span className="font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default QuickStats;