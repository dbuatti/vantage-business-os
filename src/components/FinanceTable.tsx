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
import { Button } from "@/components/ui/button";
import { CalculatedEntry } from '@/types/finance';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FinanceTableProps {
  entries: CalculatedEntry[];
  onDeleteEntry: (id: string) => void;
}

const FinanceTable = ({ entries, onDeleteEntry }: FinanceTableProps) => {
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
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-indigo-50/50">
            <TableRow>
              <TableHead className="font-bold text-indigo-900">Date</TableHead>
              <TableHead className="font-bold text-indigo-900">Credit was</TableHead>
              <TableHead className="font-bold text-indigo-900">Amount</TableHead>
              <TableHead className="font-bold text-indigo-900">Account</TableHead>
              <TableHead className="font-bold text-indigo-900">Progress/Diff</TableHead>
              <TableHead className="font-bold text-indigo-900">Month Year</TableHead>
              <TableHead className="font-bold text-indigo-900 w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-500">
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
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this {entry.account} entry from {format(new Date(entry.date), 'MMM dd, yyyy')}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteEntry(entry.id)} className="bg-rose-600 hover:bg-rose-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-indigo-100">
        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-500 px-4">
            No entries logged yet. Start by adding your first weekly update!
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      entry.account === 'Savings' 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {entry.account}
                  </Badge>
                  <span className="text-sm text-gray-500">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this {entry.account} entry from {format(new Date(entry.date), 'MMM dd, yyyy')}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteEntry(entry.id)} className="bg-rose-600 hover:bg-rose-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-indigo-900">{formatCurrency(entry.amount)}</div>
                  {entry.creditWas !== undefined && (
                    <div className="text-xs text-gray-500">Was: {formatCurrency(entry.creditWas)}</div>
                  )}
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-lg font-bold text-sm",
                  entry.difference > 0 ? "text-emerald-600 bg-emerald-50" : 
                  entry.difference < 0 ? "text-rose-600 bg-rose-50" : "text-gray-400 bg-gray-50"
                )}>
                  {formatCurrency(entry.difference)}
                </div>
              </div>
              <div className="text-xs text-gray-400">{entry.monthYear}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FinanceTable;