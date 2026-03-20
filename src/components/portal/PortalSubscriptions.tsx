"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  PieChart, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/format';
import { Transaction } from '@/types/finance';

interface PortalSubscriptionsProps {
  data: Array<[string, { total: number, items: Transaction[] }]>;
  expandedSections: Set<string>;
  onToggleSection: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCopyAmount: (text: string, id: string) => void;
  copiedId: string | null;
}

const PortalSubscriptions = ({
  data,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onCopyAmount,
  copiedId
}: PortalSubscriptionsProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="ghost" size="sm" onClick={onExpandAll} className="h-8 text-xs gap-1.5 rounded-lg">
          <Maximize2 className="w-3.5 h-3.5" /> Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={onCollapseAll} className="h-8 text-xs gap-1.5 rounded-lg">
          <Minimize2 className="w-3.5 h-3.5" /> Collapse All
        </Button>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Subscription Category Summary
          </CardTitle>
          <CardDescription>Total spend grouped by secondary category.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="pl-6">Category</TableHead>
                <TableHead className="text-right pr-6">Total Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(([catName, groupData]) => (
                <TableRow key={catName}>
                  <TableCell className="pl-6 font-bold">{catName}</TableCell>
                  <TableCell className="text-right pr-6 font-black text-primary">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 font-bold text-primary hover:bg-primary/5 gap-2"
                      onClick={() => onCopyAmount(groupData.total.toString(), `${catName}-sub`)}
                    >
                      {formatCurrency(groupData.total)}
                      {copiedId === `${catName}-sub` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {data.map(([catName, groupData]) => {
          const isExpanded = expandedSections.has(catName);
          return (
            <Card key={catName} className="border-0 shadow-lg overflow-hidden">
              <button 
                onClick={() => onToggleSection(catName)}
                className="w-full text-left bg-muted/10 border-b py-3 px-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">{catName}</CardTitle>
                  <Badge variant="outline" className="rounded-lg">{groupData.items.length} transactions</Badge>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {isExpanded && (
                <CardContent className="p-0 animate-fade-in">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/5">
                        <TableHead className="w-32 text-[10px] uppercase font-bold">Date</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Merchant</TableHead>
                        <TableHead className="text-right pr-6 text-[10px] uppercase font-bold">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupData.items.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs">{formatDate(t.transaction_date)}</TableCell>
                          <TableCell className="text-xs font-medium">{t.description}</TableCell>
                          <TableCell className="text-right pr-6 text-xs font-black tabular-nums">{formatCurrency(t.amount)}</TableCell>
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
    </div>
  );
};

export default PortalSubscriptions;