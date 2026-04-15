"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { History, Receipt, Calendar, Tag } from 'lucide-react';

interface TrackerDrilldownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  periodLabel: string;
  transactions: any[];
  budget: number;
}

const TrackerDrilldown = ({ open, onOpenChange, category, periodLabel, transactions, budget }: TrackerDrilldownProps) => {
  const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
  const isOver = budget > 0 && total > budget;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md flex flex-col p-0 border-l-0 shadow-2xl">
        <SheetHeader className="p-6 bg-muted/20 border-b">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <History className="w-5 h-5" />
            </div>
            <Badge variant="outline" className="rounded-lg font-black uppercase tracking-tighter">
              {periodLabel}
            </Badge>
          </div>
          <SheetTitle className="text-2xl font-black tracking-tight">{category}</SheetTitle>
          <SheetDescription className="text-sm font-medium">
            Reviewing {transactions.length} transactions for this period.
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 grid grid-cols-2 gap-4 border-b bg-background">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Spent</p>
            <p className={cn("text-2xl font-black", isOver ? "text-rose-600" : "text-foreground")}>
              {formatCurrency(total)}
            </p>
          </div>
          {budget > 0 && (
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Budget Target</p>
              <p className="text-2xl font-black text-muted-foreground/60">{formatCurrency(budget)}</p>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {transactions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center opacity-50">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-muted-foreground">No transactions found.</p>
              </div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                        {t.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(t.transaction_date), 'MMM dd')}
                        </span>
                        {t.category_2 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                            <Tag className="w-3 h-3" />
                            {t.category_2}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-black text-sm tabular-nums text-rose-600">
                      {formatCurrency(Math.abs(t.amount))}
                    </p>
                  </div>
                  {t.notes && (
                    <p className="mt-2 text-[11px] text-muted-foreground italic bg-muted/50 p-2 rounded-lg border border-dashed">
                      {t.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-6 bg-muted/10 border-t">
          <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">
            End of list
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TrackerDrilldown;