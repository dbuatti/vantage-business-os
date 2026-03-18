"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortField = 'date' | 'amount' | 'account' | 'difference';
export type SortOrder = 'asc' | 'desc';

interface SortControlProps {
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

const SortControl = ({ sortField, sortOrder, onSortChange }: SortControlProps) => {
  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'date', label: 'Date' },
    { field: 'amount', label: 'Amount' },
    { field: 'account', label: 'Account' },
    { field: 'difference', label: 'Difference' },
  ];

  const getSortLabel = () => {
    const option = sortOptions.find(o => o.field === sortField);
    return option?.label || 'Date';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-indigo-100 hover:bg-indigo-50">
          {sortOrder === 'asc' ? (
            <ArrowUp className="h-3 w-3 mr-2" />
          ) : (
            <ArrowDown className="h-3 w-3 mr-2" />
          )}
          Sort: {getSortLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortOptions.map(({ field, label }) => (
          <DropdownMenuItem
            key={field}
            onClick={() => {
              if (sortField === field) {
                onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                onSortChange(field, 'desc');
              }
            }}
            className={cn(
              "flex items-center justify-between",
              sortField === field && "bg-indigo-50"
            )}
          >
            <span>{label}</span>
            {sortField === field && (
              sortOrder === 'asc' ? (
                <ArrowUp className="h-3 w-3 text-indigo-600" />
              ) : (
                <ArrowDown className="h-3 w-3 text-indigo-600" />
              )
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SortControl;