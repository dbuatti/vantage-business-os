"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const DateRangeFilter = ({ dateRange, onDateRangeChange }: DateRangeFilterProps) => {
  const presets = [
    { label: 'Last 7 days', range: { from: subDays(new Date(), 7), to: new Date() } },
    { label: 'Last 30 days', range: { from: subDays(new Date(), 30), to: new Date() } },
    { label: 'This month', range: { from: startOfMonth(new Date()), to: new Date() } },
    { label: 'Last month', range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: 'Last 3 months', range: { from: subMonths(new Date(), 3), to: new Date() } },
  ];

  const clearFilter = () => {
    onDateRangeChange({ from: undefined, to: undefined });
  };

  const hasFilter = dateRange.from || dateRange.to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal border-indigo-100 hover:bg-indigo-50",
              hasFilter && "bg-indigo-50 border-indigo-200"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(dateRange.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Filter by date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b border-gray-100">
            <div className="flex flex-wrap gap-1">
              {presets.map(({ label, range }) => (
                <Button
                  key={label}
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onDateRangeChange(range)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) => onDateRangeChange({ from: range?.from, to: range?.to })}
            numberOfMonths={2}
            className="p-3"
          />
        </PopoverContent>
      </Popover>
      
      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilter}
          className="h-8 text-gray-500 hover:text-gray-700"
        >
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};

export default DateRangeFilter;