import { format, parseISO } from 'date-fns';

/**
 * Formats a number as USD currency.
 */
export const formatCurrency = (amount: number, includeSign = false) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    signDisplay: includeSign ? 'always' : 'auto',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats a date string into a readable format.
 */
export const formatDate = (dateStr: string, formatStr = 'MMM dd, yyyy') => {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), formatStr);
  } catch (e) {
    return dateStr;
  }
};

/**
 * Safely parses a numeric string from an input.
 */
export const parseNumericInput = (val: string): number => {
  const parsed = parseFloat(val.replace(/[$,\s]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}