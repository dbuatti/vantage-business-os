"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpDown, Link as LinkIcon, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/finance';
import { Link } from 'react-router-dom';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: any) => void;
}

const TransactionTable = ({
  transactions,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onEdit,
  onDelete,
  expandedId,
  onToggleExpand,
  sortField,
  sortOrder,
  onSort
}: TransactionTableProps) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      signDisplay: val !== 0 ? 'always' : 'auto' 
    }).format(val);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 w-full bg-muted/20 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10">
              <Checkbox
                checked={transactions.length > 0 && selectedIds.size === transactions.length}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80" onClick={() => onSort('date')}>
              <div className="flex items-center gap-1">Date {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}</div>
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80" onClick={() => onSort('description')}>
              <div className="flex items-center gap-1">Description {sortField === 'description' && <ArrowUpDown className="w-3 h-3" />}</div>
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase cursor-pointer hover:bg-muted/80" onClick={() => onSort('category')}>
              <div className="flex items-center gap-1">Category {sortField === 'category' && <ArrowUpDown className="w-3 h-3" />}</div>
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase hidden md:table-cell">Account</TableHead>
            <TableHead className="font-semibold text-xs uppercase text-right cursor-pointer hover:bg-muted/80" onClick={() => onSort('amount')}>
              <div className="flex items-center justify-end gap-1">Amount {sortField === 'amount' && <ArrowUpDown className="w-3 h-3" />}</div>
            </TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <React.Fragment key={t.id}>
              <TableRow 
                className={cn(
                  "hover:bg-muted/30 transition-colors group cursor-pointer border-b",
                  selectedIds.has(t.id!) && "bg-primary/5",
                  expandedId === t.id && "bg-muted/40"
                )}
                onClick={() => onToggleExpand(t.id!)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(t.id!)}
                    onCheckedChange={() => onToggleSelect(t.id!)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm font-medium">
                  {format(new Date(t.transaction_date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="max-w-[250px]">
                  <div className="truncate font-medium" title={t.description}>{t.description}</div>
                  {t.notes && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{t.notes}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-primary/5 text-primary border-primary/10">
                      {t.category_1 || 'Uncategorized'}
                    </Badge>
                    {t.is_work && (
                      <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-amber-50 text-amber-700 border-amber-200">Work</Badge>
                    )}
                    {t.invoice_id && (
                      <Badge variant="outline" className="rounded-lg text-[10px] font-medium bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        Invoiced
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{t.account_label}</TableCell>
                <TableCell className={cn("text-right font-bold tabular-nums", t.amount > 0 ? "text-emerald-600" : t.amount < 0 ? "text-rose-600" : "")}>
                  {formatCurrency(t.amount)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => onEdit(t)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600" onClick={() => onDelete(t.id!)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedId === t.id && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={7} className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm animate-fade-in">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Date</p>
                        <p className="font-medium">{format(new Date(t.transaction_date), 'EEEE, MMMM dd, yyyy')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Details</p>
                        <p className="font-medium">{t.account_label || '—'}</p>
                        <p className="text-xs text-muted-foreground">{t.account_identifier}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categorization</p>
                        <p className="font-medium">{t.category_1 || '—'}</p>
                        {t.category_2 && <p className="text-xs text-muted-foreground">{t.category_2}</p>}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction Breakdown</p>
                        <div className="space-y-0.5">
                          {t.credit && <p className="text-emerald-600 font-medium">Credit: {formatCurrency(t.credit)}</p>}
                          {t.debit && <p className="text-rose-600 font-medium">Debit: {formatCurrency(t.debit)}</p>}
                          <p className="font-bold">Net: {formatCurrency(t.amount)}</p>
                        </div>
                      </div>
                      {t.invoice_id && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Linked Invoice</p>
                          <Button variant="link" asChild className="p-0 h-auto text-primary">
                            <Link to={`/invoices/${t.invoice_id}`} className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              View Invoice
                            </Link>
                          </Button>
                        </div>
                      )}
                      {t.notes && (
                        <div className="col-span-2 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes</p>
                          <p className="text-sm bg-background p-2 rounded-lg border">{t.notes}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Period</p>
                        <p className="font-medium">Week {t.week} · {t.mmm_yyyy || t.month_name}</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionTable;