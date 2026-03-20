"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowUpDown, FileText, ChevronRight, ChevronDown, Info, ExternalLink, Briefcase, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/finance';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';

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
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b">
              <TableHead className="w-10">
                <Checkbox
                  checked={transactions.length > 0 && selectedIds.size === transactions.length}
                  onCheckedChange={onToggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-8"></TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => onSort('date')}>
                <div className="flex items-center gap-1">Date {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}</div>
              </TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => onSort('description')}>
                <div className="flex items-center gap-1">Description {sortField === 'description' && <ArrowUpDown className="w-3 h-3" />}</div>
              </TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => onSort('category')}>
                <div className="flex items-center gap-1">Category {sortField === 'category' && <ArrowUpDown className="w-3 h-3" />}</div>
              </TableHead>
              <TableHead className="font-bold text-[10px] uppercase tracking-widest text-right cursor-pointer hover:text-primary transition-colors" onClick={() => onSort('amount')}>
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
                    "hover:bg-primary/[0.02] transition-all group cursor-pointer border-b relative",
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
                  <TableCell className="px-0">
                    {expandedId === t.id ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {format(new Date(t.transaction_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="truncate font-bold text-sm group-hover:text-primary transition-colors" title={t.description}>{t.description}</div>
                    {t.notes && <div className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1"><Info className="w-2.5 h-2.5" /> {t.notes}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-tighter bg-primary/5 text-primary border-primary/10">
                        {t.category_1 || 'Uncategorized'}
                      </Badge>
                      {t.is_work && (
                        <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-700 border-amber-200">Work</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right font-black tabular-nums", t.amount > 0 ? "text-emerald-600" : t.amount < 0 ? "text-rose-600" : "")}>
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
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in border-b">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Transaction Date</p>
                            <p className="font-bold text-sm">{format(new Date(t.transaction_date), 'EEEE, MMMM dd, yyyy')}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Account Source</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="rounded-lg font-bold">{t.account_label || 'Manual Entry'}</Badge>
                              <span className="text-xs text-muted-foreground font-mono">{t.account_identifier}</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categorization</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge className="bg-primary text-white rounded-lg font-bold">{t.category_1 || 'None'}</Badge>
                              {t.category_2 && <Badge variant="outline" className="rounded-lg font-bold">{t.category_2}</Badge>}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financial Impact</p>
                            <div className="space-y-1">
                              {t.credit && <p className="text-xs text-emerald-600 font-bold">Credit: {formatCurrency(t.credit)}</p>}
                              {t.debit && <p className="text-xs text-rose-600 font-bold">Debit: {formatCurrency(t.debit)}</p>}
                              <p className="text-sm font-black">Net: {formatCurrency(t.amount)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {t.invoice_id && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Linked Invoice</p>
                              <Button variant="outline" size="sm" asChild className="rounded-xl gap-2 h-9 border-primary/20 text-primary hover:bg-primary/5">
                                <Link to={`/invoices/${t.invoice_id}`}>
                                  <FileText className="w-3.5 h-3.5" />
                                  View Invoice
                                </Link>
                              </Button>
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes & Metadata</p>
                            <div className="p-3 rounded-xl bg-background border text-xs leading-relaxed italic text-muted-foreground">
                              {t.notes || 'No additional notes provided for this transaction.'}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pt-2">
                            <div className="text-center">
                              <p className="text-[9px] font-black uppercase text-muted-foreground">Week</p>
                              <p className="font-bold text-xs">{t.week}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] font-black uppercase text-muted-foreground">Period</p>
                              <p className="font-bold text-xs">{t.mmm_yyyy || t.month_name}</p>
                            </div>
                          </div>
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

      {/* Mobile List View */}
      <div className="md:hidden divide-y">
        {transactions.map((t) => (
          <div 
            key={t.id} 
            className={cn(
              "p-4 space-y-3 transition-all active:bg-muted/50",
              selectedIds.has(t.id!) && "bg-primary/5"
            )}
            onClick={() => onToggleExpand(t.id!)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div onClick={(e) => e.stopPropagation()} className="pt-1">
                  <Checkbox
                    checked={selectedIds.has(t.id!)}
                    onCheckedChange={() => onToggleSelect(t.id!)}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {format(new Date(t.transaction_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="font-bold text-sm truncate mt-0.5">{t.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-tighter bg-primary/5 text-primary border-primary/10">
                      {t.category_1 || 'Uncategorized'}
                    </Badge>
                    {t.is_work && (
                      <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase tracking-tighter bg-amber-50 text-amber-700 border-amber-200">
                        <Briefcase className="w-2 h-2 mr-1" /> Work
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={cn("font-black text-sm tabular-nums", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatCurrency(t.amount)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => onEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500" onClick={() => onDelete(t.id!)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            
            {expandedId === t.id && (
              <div className="pt-3 mt-3 border-t space-y-4 animate-fade-in">
                {t.notes && (
                  <div className="p-3 rounded-xl bg-muted/30 border text-xs italic text-muted-foreground">
                    {t.notes}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Account</p>
                    <p className="text-xs font-bold">{t.account_label || 'Manual'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">Period</p>
                    <p className="text-xs font-bold">{t.mmm_yyyy || 'N/A'}</p>
                  </div>
                </div>
                {t.invoice_id && (
                  <Button variant="outline" size="sm" asChild className="w-full rounded-xl gap-2 h-10">
                    <Link to={`/invoices/${t.invoice_id}`}>
                      <FileText className="w-4 h-4" />
                      View Linked Invoice
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionTable;