"use client";

import React from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/format';
import { Transaction } from '@/types/finance';

interface PortalTaxSummaryProps {
  income: Transaction[];
  expenseGroups: Record<string, { 
    label: string, 
    icon: any, 
    color: string, 
    bg: string, 
    text: string, 
    items: Transaction[] 
  }>;
  expandedSections: Set<string>;
  onToggleSection: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const PortalTaxSummary = ({
  income,
  expenseGroups,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll
}: PortalTaxSummaryProps) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={onExpandAll} className="h-8 text-xs gap-1.5 rounded-lg">
          <Maximize2 className="w-3.5 h-3.5" /> Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={onCollapseAll} className="h-8 text-xs gap-1.5 rounded-lg">
          <Minimize2 className="w-3.5 h-3.5" /> Collapse All
        </Button>
      </div>

      {/* Income Section */}
      {income.length > 0 && (
        <Card className="border-0 shadow-xl overflow-hidden">
          <button 
            onClick={() => onToggleSection('income')}
            className="w-full text-left bg-emerald-50 dark:bg-emerald-950/30 border-b p-4 flex items-center justify-between hover:bg-emerald-100/50 transition-colors"
          >
            <CardTitle className="text-xl text-emerald-900 dark:text-emerald-100">Business Income</CardTitle>
            {expandedSections.has('income') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          {expandedSections.has('income') && (
            <CardContent className="p-0 animate-fade-in">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {income.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-medium">{formatDate(t.transaction_date)}</TableCell>
                      <TableCell className="text-sm font-bold">{t.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] rounded-lg bg-white dark:bg-card">{t.category_1}</Badge></TableCell>
                      <TableCell className="text-right font-black text-emerald-600">{formatCurrency(t.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      {/* Expense Groups */}
      {Object.entries(expenseGroups).map(([key, bucket]) => {
        if (bucket.items.length === 0) return null;
        const rawTotal = bucket.items.reduce((s, t) => s + Math.abs(t.amount), 0);
        const isExpanded = expandedSections.has(key);

        return (
          <Card key={key} className="border-0 shadow-xl overflow-hidden break-inside-avoid">
            <button 
              onClick={() => onToggleSection(key)}
              className={cn("w-full text-left border-b p-4 flex items-center justify-between transition-colors", bucket.bg, "dark:bg-muted/20 hover:opacity-90")}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl bg-white dark:bg-card shadow-sm", bucket.color)}>
                  <bucket.icon className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className={cn("text-xl", bucket.text, "dark:text-foreground")}>{bucket.label}</CardTitle>
                  <CardDescription className={cn(bucket.text, "opacity-80 dark:text-muted-foreground")}>
                    Total: <span className="font-bold">{formatCurrency(rawTotal)}</span>
                  </CardDescription>
                </div>
              </div>
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            {isExpanded && (
              <CardContent className="p-0 animate-fade-in">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-1/4">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bucket.items.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/20 group">
                        <TableCell className="text-xs font-medium">{formatDate(t.transaction_date)}</TableCell>
                        <TableCell className="text-sm font-bold">{t.description}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] rounded-lg bg-white dark:bg-card">{t.category_1}</Badge></TableCell>
                        <TableCell className="text-right font-black text-rose-600">{formatCurrency(t.amount)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground italic">{t.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default PortalTaxSummary;