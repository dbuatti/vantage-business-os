"use client";

import React, { useState, useEffect } from 'react';
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
import { format, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { Trash2, Pencil, Filter, ArrowUpRight, ArrowDownRight, Copy, Clipboard, Repeat } from 'lucide-react';
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
import { showSuccess } from '@/utils/toast';

interface FinanceTableProps {
  entries: CalculatedEntry[];
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, updates: { amount: number; creditWas?: number }) => void;
  onDuplicateEntry: (entry: CalculatedEntry) => void;
}

const FinanceTable = ({ entries, onDeleteEntry, onUpdateEntry, onDuplicateEntry }: FinanceTableProps) => {
  const [filter, setFilter] = useState<AccountType | 'All'>('All');
  const [editingEntry, setEditingEntry] = useState<CalculatedEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCreditWas, setEditCreditWas] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  // Track recently added entries
  useEffect(() => {
    const newRecent = new Set<string>();
    entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (differenceInHours(new Date(), entryDate) < 24) {
        newRecent.add(entry.id);
      }
    });
    setRecentlyAdded(newRecent);
  }, [entries]);

  const savingsCount = entries.filter(e => e.account === 'Savings').length;
  const creditCount = entries.filter(e => e.account === 'Credit').length;

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

  const copyToClipboard = (entry: CalculatedEntry) => {
    const text = [
      `Date: ${format(new Date(entry.date), 'MMM dd, yyyy')}`,
      `Account: ${entry.account}`,
      `Amount: ${formatCurrency(entry.amount)}`,
      entry.creditWas !== undefined ? `Credit Was: ${formatCurrency(entry.creditWas)}` : null,
      `Change: ${formatCurrency(entry.difference)}`
    ].filter(Boolean).join('\n');
    
    navigator.clipboard.writeText(text);
    showSuccess('Entry copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Filter className="w-4 h-4 text-primary" />
        <Select value={filter} onValueChange={(val) => setFilter(val as AccountType | 'All')}>
          <SelectTrigger className="w-40 h-9 rounded-xl text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">
              <span className="flex items-center gap-2">
                All Accounts
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{entries.length}</Badge>
              </span>
            </SelectItem>
            <SelectItem value="Savings">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Savings
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{savingsCount}</Badge>
              </span>
            </SelectItem>
            <SelectItem value="Credit">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Credit
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{creditCount}</Badge>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          Showing {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Credit Was</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Account</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Change</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="font-medium text-muted-foreground">No entries yet</p>
                      <p className="text-sm text-muted-foreground/60">Start by adding your first weekly update above</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry, i) => (
                  <TableRow 
                    key={entry.id} 
                    className={cn(
                      "hover:bg-muted/30 transition-all group",
                      recentlyAdded.has(entry.id) && "bg-primary/5"
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                        {recentlyAdded.has(entry.id) && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">New</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.creditWas !== undefined ? formatCurrency(entry.creditWas) : "—"}
                    </TableCell>
                    <TableCell className="font-bold text-base">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "px-2.5 py-1 rounded-lg font-medium text-xs",
                          entry.account === 'Savings' 
                            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" 
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                        )}
                      >
                        {entry.account}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center gap-1 font-bold text-sm px-2.5 py-1 rounded-lg",
                        entry.difference > 0 
                          ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" 
                          : entry.difference < 0 
                          ? "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950" 
                          : "text-muted-foreground bg-muted"
                      )}>
                        {entry.difference > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {entry.difference < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {formatCurrency(entry.difference)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => onDuplicateEntry(entry)}
                          title="Duplicate entry"
                        >
                          <Repeat className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => copyToClipboard(entry)}
                          title="Copy to clipboard"
                        >
                          <Clipboard className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                          onClick={() => openEditDialog(entry)}
                          title="Edit entry"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950" title="Delete entry">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this {entry.account} entry from {format(new Date(entry.date), 'MMM dd, yyyy')}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteEntry(entry.id)} className="rounded-xl bg-rose-600 hover:bg-rose-700">
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

        <div className="md:hidden divide-y">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <p className="font-medium text-muted-foreground">No entries yet</p>
                <p className="text-sm text-muted-foreground/60">Start by adding your first weekly update</p>
              </div>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div 
                key={entry.id} 
                className={cn(
                  "p-4 space-y-3 hover:bg-muted/30 transition-colors",
                  recentlyAdded.has(entry.id) && "bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "px-2 py-0.5 rounded-lg text-xs font-medium",
                        entry.account === 'Savings' 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      {entry.account}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), 'MMM dd, yyyy')}
                    </span>
                    {recentlyAdded.has(entry.id) && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">New</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg"
                      onClick={() => onDuplicateEntry(entry)}
                      title="Duplicate"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg"
                      onClick={() => copyToClipboard(entry)}
                      title="Copy"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this entry.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteEntry(entry.id)} className="rounded-xl bg-rose-600 hover:bg-rose-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold">{formatCurrency(entry.amount)}</div>
                    {entry.creditWas !== undefined && (
                      <div className="text-xs text-muted-foreground">Was: {formatCurrency(entry.creditWas)}</div>
                    )}
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1 font-bold text-sm px-2.5 py-1 rounded-lg",
                    entry.difference > 0 
                      ? "text-emerald-700 bg-emerald-50" 
                      : entry.difference < 0 
                      ? "text-rose-700 bg-rose-50" 
                      : "text-muted-foreground bg-muted"
                  )}>
                    {entry.difference > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {entry.difference < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                    {formatCurrency(entry.difference)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                "w-3 h-3 rounded-full",
                editingEntry?.account === 'Savings' ? "bg-blue-500" : "bg-amber-500"
              )} />
              Edit {editingEntry?.account} Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-xl">
              📅 {editingEntry && format(new Date(editingEntry.date), 'MMMM dd, yyyy')}
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
                  className="rounded-xl h-11"
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
                className="rounded-xl h-11 text-lg font-semibold"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingEntry(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="rounded-xl bg-primary">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceTable;