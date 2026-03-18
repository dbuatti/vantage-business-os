"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, X, Filter } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

export interface TransactionFilters {
  search: string;
  category: string;
  type: 'all' | 'income' | 'expense';
  work: 'all' | 'work' | 'personal';
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  minAmount: string;
  maxAmount: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  categories: string[];
  totalCount: number;
  filteredCount: number;
}

const TransactionFiltersComponent = ({ 
  filters, 
  onFiltersChange, 
  categories,
  totalCount,
  filteredCount
}: TransactionFiltersProps) => {
  const updateFilter = (key: keyof TransactionFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const presets = [
    { label: 'Last 7 days', range: { from: subDays(new Date(), 7), to: new Date() } },
    { label: 'Last 30 days', range: { from: subDays(new Date(), 30), to: new Date() } },
    { label: 'This month', range: { from: startOfMonth(new Date()), to: new Date() } },
    { label: 'Last month', range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: 'Last 3 months', range: { from: subMonths(new Date(), 3), to: new Date() } },
    { label: 'Last 6 months', range: { from: subMonths(new Date(), 6), to: new Date() } },
    { label: 'This year', range: { from: new Date(new Date().getFullYear(), 0, 1), to: new Date() } },
  ];

  const hasActiveFilters = 
    filters.search || 
    filters.category !== 'All' || 
    filters.type !== 'all' || 
    filters.work !== 'all' ||
    filters.dateRange.from ||
    filters.dateRange.to ||
    filters.minAmount ||
    filters.maxAmount;

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      category: 'All',
      type: 'all',
      work: 'all',
      dateRange: { from: undefined, to: undefined },
      minAmount: '',
      maxAmount: ''
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search description, category, notes..."
              className="pl-10 rounded-xl"
            />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.work} onValueChange={(v) => updateFilter('work', v)}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue placeholder="Work" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="work">Work Only</SelectItem>
              <SelectItem value="personal">Personal Only</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal rounded-xl",
                  (filters.dateRange.from || filters.dateRange.to) && "bg-primary/5 border-primary/20"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, "MMM dd")} - {format(filters.dateRange.to, "MMM dd")}
                    </>
                  ) : (
                    format(filters.dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  <span>Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <div className="flex flex-wrap gap-1">
                  {presets.map(({ label, range }) => (
                    <Button
                      key={label}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => updateFilter('dateRange', range)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <Calendar
                mode="range"
                selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                onSelect={(range) => updateFilter('dateRange', { from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className="p-3"
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="rounded-xl text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Amount Range */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Amount:</Label>
          <Input
            type="number"
            placeholder="Min"
            value={filters.minAmount}
            onChange={(e) => updateFilter('minAmount', e.target.value)}
            className="w-24 h-8 rounded-lg text-sm"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxAmount}
            onChange={(e) => updateFilter('maxAmount', e.target.value)}
            className="w-24 h-8 rounded-lg text-sm"
          />
        </div>
        
        {hasActiveFilters && (
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredCount}</span> of {totalCount} transactions
          </p>
        )}
      </div>
    </div>
  );
};

export default TransactionFiltersComponent;