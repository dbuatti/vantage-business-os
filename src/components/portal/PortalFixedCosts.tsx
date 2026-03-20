"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Home, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/format';
import { Transaction } from '@/types/finance';

interface PortalFixedCostsProps {
  data: Array<[string, { total: number, items: Transaction[], icon: any, color: string, bg: string }]>;
  expandedSections: Set<string>;
  onToggleSection: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCopyAmount: (text: string, id: string) => void;
  copiedId: string | null;
}

const PortalFixedCosts = ({
  data,
  expandedSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onCopyAmount,
  copiedId
}: PortalFixedCostsProps) => {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(([groupName, groupData]) => (
          <Card key={groupName} className="border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-2xl shadow-sm", groupData.bg, groupData.color)}>
                  <groupData.icon className="w-6 h-6" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onCopyAmount(groupData.total.toString(), `${groupName}-fixed`)}
                >
                  {copiedId === `${groupName}-fixed` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </Button>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{groupName}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-rose-600">{formatCurrency(groupData.total)}</p>
                  <span className="text-[10px] font-bold text-muted-foreground">{groupData.items.length} items</span>
                </div>
              </div>
              <button 
                onClick={() => onToggleSection(groupName)}
                className="mt-4 pt-4 border-t w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors"
              >
                <span>{expandedSections.has(groupName) ? 'Hide details' : 'View details'}</span>
                {expandedSections.has(groupName) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {data.map(([groupName, groupData]) => {
          if (!expandedSections.has(groupName)) return null;
          return (
            <Card key={groupName} className="border-0 shadow-lg overflow-hidden animate-fade-in">
              <CardHeader className="bg-muted/10 border-b py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-lg", groupData.bg, groupData.color)}>
                      <groupData.icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-sm font-black uppercase tracking-wider">{groupName}</CardTitle>
                  </div>
                  <Badge variant="secondary" className="rounded-lg font-bold">{groupData.items.length} transactions</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="w-32 text-[10px] uppercase font-black">Date</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">Description</TableHead>
                      <TableHead className="text-right pr-6 text-[10px] uppercase font-black">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupData.items.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs font-medium">{formatDate(t.transaction_date)}</TableCell>
                        <TableCell className="text-xs font-bold">{t.description}</TableCell>
                        <TableCell className="text-right pr-6 text-xs font-black tabular-nums text-rose-600">{formatCurrency(t.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PortalFixedCosts;