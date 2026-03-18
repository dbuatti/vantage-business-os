"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { CalculatedEntry } from '@/types/finance';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { showSuccess } from '@/utils/toast';

interface ExportButtonProps {
  entries: CalculatedEntry[];
  label?: string;
}

const ExportButton = ({ entries, label = "Export CSV" }: ExportButtonProps) => {
  const exportToCSV = () => {
    if (entries.length === 0) return;

    const headers = ['Date', 'Account', 'Amount', 'Credit Was', 'Difference', 'Month Year'];
    const rows = entries.map(entry => [
      format(new Date(entry.date), 'yyyy-MM-dd'),
      entry.account,
      entry.amount.toString(),
      entry.creditWas?.toString() || '',
      entry.difference.toString(),
      entry.monthYear
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `finance-log-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess(`Exported ${entries.length} entries to CSV`);
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={exportToCSV}
      disabled={entries.length === 0}
      className="rounded-xl gap-2"
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
      {entries.length > 0 && (
        <span className="text-xs text-muted-foreground">({entries.length})</span>
      )}
    </Button>
  );
};

export default ExportButton;