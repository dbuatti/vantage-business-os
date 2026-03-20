"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ListChecks, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';

interface PortalTotalsTableProps {
  data: Array<[string, { 
    income: number; 
    expenses: number; 
    categories: Record<string, { 
      income: number; 
      expenses: number; 
      count: number;
      subcategories: Record<string, { income: number; expenses: number; count: number }>
    }>
  }]>;
  onCopyAmount: (text: string, id: string) => void;
  onCopyAll: () => void;
  copiedId: string | null;
}

const PortalTotalsTable = ({
  data,
  onCopyAmount,
  onCopyAll,
  copiedId
}: PortalTotalsTableProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onCopyAll} className="rounded-xl gap-2">
          <Copy className="w-4 h-4" /> Copy All Totals
        </Button>
      </div>
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Financial Totals by Category & Subcategory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-6">Group / Category / Subcategory</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right pr-6">Net Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(([groupName, groupData]) => (
                <React.Fragment key={groupName}>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell className="pl-6 font-black uppercase tracking-wider text-xs text-primary">
                      {groupName}
                    </TableCell>
                    <TableCell className="text-right">
                      {groupData.income > 0 ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 font-bold text-emerald-600 hover:bg-emerald-50 gap-2"
                          onClick={() => onCopyAmount(groupData.income.toString(), `${groupName}-inc`)}
                        >
                          {formatCurrency(groupData.income)}
                          {copiedId === `${groupName}-inc` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                        </Button>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {groupData.expenses > 0 ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 font-bold text-rose-600 hover:bg-rose-50 gap-2"
                          onClick={() => onCopyAmount(groupData.expenses.toString(), `${groupName}-exp`)}
                        >
                          {formatCurrency(groupData.expenses)}
                          {copiedId === `${groupName}-exp` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                        </Button>
                      ) : '—'}
                    </TableCell>
                    <TableCell className={cn("text-right font-black pr-6", (groupData.income - groupData.expenses) >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      {formatCurrency(groupData.income - groupData.expenses)}
                    </TableCell>
                  </TableRow>
                  {Object.entries(groupData.categories)
                    .sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses))
                    .map(([catName, catData]) => (
                      <React.Fragment key={catName}>
                        <TableRow className="hover:bg-muted/5 border-b group bg-muted/5">
                          <TableCell className="pl-10 text-sm font-bold text-foreground/80">
                            {catName}
                            <span className="ml-2 text-[10px] text-muted-foreground font-normal">({catData.count} txns)</span>
                          </TableCell>
                          <TableCell className="text-right">
                            {catData.income > 0 ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs text-emerald-600/80 hover:bg-emerald-50 gap-1.5"
                                onClick={() => onCopyAmount(catData.income.toString(), `${catName}-inc`)}
                              >
                                {formatCurrency(catData.income)}
                                {copiedId === `${catName}-inc` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />}
                              </Button>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {catData.expenses > 0 ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs text-rose-600/80 hover:bg-rose-50 gap-1.5"
                                onClick={() => onCopyAmount(catData.expenses.toString(), `${catName}-exp`)}
                              >
                                {formatCurrency(catData.expenses)}
                                {copiedId === `${catName}-exp` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />}
                              </Button>
                            ) : '—'}
                          </TableCell>
                          <TableCell className={cn("text-right text-sm font-black pr-6 tabular-nums", (catData.income - catData.expenses) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {formatCurrency(catData.income - catData.expenses)}
                          </TableCell>
                        </TableRow>
                        {Object.entries(catData.subcategories)
                          .sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses))
                          .map(([subName, subData]) => (
                            <TableRow key={subName} className="hover:bg-muted/5 border-b last:border-0 group">
                              <TableCell className="pl-16 text-xs font-medium text-muted-foreground">
                                {subName}
                                <span className="ml-2 text-[9px] opacity-60">({subData.count} txns)</span>
                              </TableCell>
                              <TableCell className="text-right">
                                {subData.income > 0 ? (
                                  <span className="text-[11px] text-emerald-600/60 tabular-nums">{formatCurrency(subData.income)}</span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {subData.expenses > 0 ? (
                                  <span className="text-[11px] text-rose-600/60 tabular-nums">{formatCurrency(subData.expenses)}</span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className={cn("text-right text-[11px] font-bold pr-6 tabular-nums opacity-80", (subData.income - subData.expenses) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {formatCurrency(subData.income - subData.expenses)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </React.Fragment>
                    ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortalTotalsTable;