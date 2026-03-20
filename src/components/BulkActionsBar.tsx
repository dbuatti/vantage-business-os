"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, Briefcase, User, Tags, X, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

interface BulkActionsBarProps {
  selectedCount: number;
  totalAmount: number;
  onMarkWork: (isWork: boolean) => void;
  onCategorize: () => void;
  onDelete: () => void;
  onClear: () => void;
}

const BulkActionsBar = ({
  selectedCount,
  totalAmount,
  onMarkWork,
  onCategorize,
  onDelete,
  onClear
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <Card className="border-0 shadow-lg bg-primary/5 border-primary/20 animate-fade-in">
      <CardContent className="p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-medium text-foreground">{formatCurrency(totalAmount)}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onMarkWork(true)} 
            className="rounded-xl gap-2 bg-background text-amber-700 border-amber-200 hover:bg-amber-50"
          >
            <Briefcase className="w-4 h-4" /> Mark Work
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onMarkWork(false)} 
            className="rounded-xl gap-2 bg-background text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            <User className="w-4 h-4" /> Mark Personal
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCategorize} 
            className="rounded-xl gap-2 bg-background"
          >
            <Tags className="w-4 h-4" /> Categorize
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear} 
            className="rounded-xl"
          >
            <X className="w-4 h-4 mr-1" /> Deselect
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete} 
            className="rounded-xl text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkActionsBar;