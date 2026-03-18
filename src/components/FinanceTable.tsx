"use client";

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalculatedEntry } from '@/types/finance';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FinanceTableProps {
  entries: CalculatedEntry[];
}

const FinanceTable = ({ entries }: FinanceTableProps) => {
  const formatCurrency = (val: number | undefined) => {
    if (val === undefined) return "";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(val);
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white shadow-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-indigo-50/50">
          <TableRow>
            <TableHead className="font-bold text-indigo-900">Date</TableHead>
            <TableHead className="font-bold text-indigo-900">Credit was</TableHead>
            <TableHead className="font-bold text-indigo-900">Amount</TableHead>
            <TableHead className="font-bold text-indigo-900">Account</TableHead>
            <TableHead className="font-bold text-indigo-900">Progress/Diff</TableHead>
            <TableHead className="font-bold text-indigo-900">Month Year</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                No entries logged yet. Start by adding your first weekly update!
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-indigo-50/30 transition-colors">
                <TableCell className="font-medium">
                  {format(new Date(entry.date), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="text-gray-600">
                  {entry.creditWas !== undefined ? formatCurrency(entry.creditWas) : ""}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(entry.amount)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "px-3 py-1 rounded-full font-medium",
                      entry.account === 'Savings' 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {entry.account}
                  </Badge>
                </TableCell>
                <TableCell className={cn(
                  "font-bold",
                  entry.difference > 0 ? "text-emerald-600 bg-emerald-50/50" : 
                  entry.difference < 0 ? "text-rose-600 bg-rose-50/50" : "text-gray-400"
                )}>
                  {formatCurrency(entry.difference)}
                </TableCell>
                <TableCell className="text-gray-500">
                  {entry.monthYear}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default FinanceTable;