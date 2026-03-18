"use client";

import React, { useState } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalculatedEntry, AccountType } from '@/types/finance';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Trash2, Pencil, X, Check, Filter } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FinanceTableProps {
  entries: CalculatedEntry[];
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, updates: { amount: number; creditWas?: number }) => void;
}

const FinanceTable = ({ entries, onDeleteEntry, onUpdateEntry }: FinanceTableProps) => {
  const [filter, setFilter] = useState<AccountType | 'All'>('All');
  const [editingEntry, setEditingEntry] = useState<CalculatedEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCreditWas, setEditCreditWas] = useState('');

  const filteredEntries = filter === 'All' 
    ? entries 
    : entries.filter(e => e.account === filter);

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined) return "";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: 'always'
    }).format(val);
  };

  const openEditDialog = (entry: CalculatedEntry) => {
    setEditingEntry(entry);
    setEditAmount(entry.amount.toString());
    setEditCreditWas(entry.creditWas?.toString() || '');
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    onUpdateEntry(editingEntry.id, {
      amount: parseFloat(editAmount) || 0,
      ...(editingEntry.account === 'Credit' && { creditWas: parseFloat(editCreditWas) || 0 })
    });
    setEditingEntry(null);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2 px-1">
        <Filter className="w-4 h-4 text-indigo-500" />
        <Select value={filter} onValueChange={(val) => setFilter(val as AccountType | 'All')}>
          <SelectTrigger className="w-32 h-8 rounded-lg border-indigo-100 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            <SelectItem value="Savings">Savings</SelectItem>
            <SelectItem value="Credit">Credit</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

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
                <TableHead className="font-bold text-indigo-900 w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                    {filter === 'All' 
                      ? 'No entries logged yet. Start by adding your first weekly update!'
                      : `No ${filter} entries found.`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
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
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          onClick={() => openEditDialog(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-indigo-100">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-10 text-gray-500 px-4">
              {filter === 'All' 
                ? 'No entries logged yet. Start by adding your first weekly update!'
                : `No ${filter} entries found.`}
            </div>
          ) : (
            filteredEntries.map((entry) => (
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
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-indigo-900">
              Edit {editingEntry?.account} Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-gray-500">
              Date: {editingEntry && format(new Date(editingEntry.date), 'MMMM dd, yyyy')}
            </div>
            {editingEntry?.account === 'Credit' && (
              <div className="space-y-2">
                <Label htmlFor="editCreditWas">Credit Was ($)</Label>
                <Input
                  id="editCreditWas"
                  type="number"
                  step="0.01"
                  value={editCreditWas}
                  onChange={(e) => setEditCreditWas(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="editAmount">Amount ($)</Label>
              <Input
                id="editAmount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceTable;