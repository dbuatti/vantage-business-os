"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalculatedEntry } from '@/types/finance';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { format, parse } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthlySummaryProps {
  entries: CalculatedEntry[];
}

interface MonthData {
  monthYear: string;
  savings: { total: number; change: number; count: number };
  credit: { total: number; change: number; count: number };
  netChange: number;
}

const MonthlySummary = ({ entries }: MonthlySummaryProps) => {
  // Group entries by month
  const monthlyData = entries.reduce((acc, entry) => {
    const key = entry.monthYear;
    if (!acc[key]) {
      acc[key] = {
        monthYear: key,
        savings: { total: 0, change: 0, count: 0 },
        credit: { total: 0, change: 0, count: 0 },
        netChange: 0
      };
    }
    
    if (entry.account === 'Savings') {
      acc[key].savings.total = entry.amount; // Latest amount
      acc[key].savings.change += entry.difference;
      acc[key].savings.count++;
    } else {
      acc[key].credit.total = entry.amount;
      acc[key].credit.change += entry.difference;
      acc[key].credit.count++;
    }
    
    acc[key].netChange = acc[key].savings.change + acc[key].credit.change;
    
    return acc;
  }, {} as Record<string, MonthData>);

  const months = Object.values(monthlyData)
    .sort((a, b) => {
      const dateA = parse(a.monthYear, 'MM/yyyy', new Date());
      const dateB = parse(b.monthYear, 'MM/yyyy', new Date());
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 6); // Last 6 months

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const formatChange = (val: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always',
    }).format(val);
    return val >= 0 ? `+${formatted.slice(1)}` : formatted;
  };

  if (months.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/50 backdrop-blur-sm border-indigo-100 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Monthly Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((month) => {
            const monthDate = parse(month.monthYear, 'MM/yyyy', new Date());
            return (
              <div 
                key={month.monthYear}
                className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700">
                    {format(monthDate, 'MMMM yyyy')}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      month.netChange > 0 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : month.netChange < 0
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-gray-50 text-gray-500"
                    )}
                  >
                    {month.netChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : month.netChange < 0 ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                    {formatChange(month.netChange)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">Savings</div>
                    <div className="font-semibold text-blue-600">
                      {formatCurrency(month.savings.total)}
                    </div>
                    {month.savings.count > 0 && (
                      <div className={cn(
                        "text-xs",
                        month.savings.change > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatChange(month.savings.change)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Credit</div>
                    <div className="font-semibold text-amber-600">
                      {formatCurrency(month.credit.total)}
                    </div>
                    {month.credit.count > 0 && (
                      <div className={cn(
                        "text-xs",
                        month.credit.change > 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatChange(month.credit.change)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySummary;