"use client";

import React from 'react';
import { CalculatedEntry } from '@/types/finance';
import { Calendar, Hash, TrendingUp } from 'lucide-react';
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

  return (
    <div className="flex flex-wrap items-center gap-4 px-1 text-sm text-gray-500">
      <div className="flex items-center gap-1.5">
        <Hash className="w-3.5 h-3.5 text-indigo-400" />
        <span>{entries.length} entries</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          {format(new Date(oldestDate), 'MMM yyyy')} — {format(new Date(newestDate), 'MMM yyyy')}
        </span>
      </div>
      {entries.length > 1 && (
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span>{positiveRate}% positive changes</span>
        </div>
      )}
    </div>
  );
};

export default QuickStats;