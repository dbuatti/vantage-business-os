"use client";

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatCurrency } from './format';

interface ExportData {
  filename: string;
  sheets: {
    name: string;
    data: any[];
    headers: string[];
  }[];
}

export const generateExcel = ({ filename, sheets }: ExportData) => {
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const ws = XLSX.utils.json_to_sheet(sheet.data, { header: sheet.headers });
    
    // Set column widths (approximate)
    const maxWidths = sheet.headers.map(h => ({ wch: h.length + 5 }));
    ws['!cols'] = maxWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const prepareAccountantData = (transactions: any[], invoices: any[], periodLabel: string) => {
  // 1. Summary Sheet
  const workTxns = transactions.filter(t => t.is_work);
  const income = workTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = workTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const summaryData = [
    { Item: 'Report Period', Value: periodLabel },
    { Item: 'Export Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm') },
    { Item: '', Value: '' },
    { Item: 'FINANCIAL SUMMARY', Value: '' },
    { Item: 'Total Business Income', Value: income },
    { Item: 'Total Business Expenses', Value: expenses },
    { Item: 'Net Position', Value: income - expenses },
  ];

  // 2. Category Totals
  const catTotals: Record<string, number> = {};
  workTxns.filter(t => t.amount < 0).forEach(t => {
    const cat = t.category_1 || 'Uncategorized';
    catTotals[cat] = (catTotals[cat] || 0) + Math.abs(t.amount);
  });

  const categoryData = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([Category, Amount]) => ({ Category, Amount }));

  // 3. Detailed Transactions
  const detailedData = workTxns.map(t => ({
    Date: t.transaction_date,
    Description: t.description,
    Category: t.category_1,
    Subcategory: t.category_2,
    Amount: t.amount,
    Notes: t.notes,
    Account: t.account_label
  }));

  // 4. Invoices
  const invoiceData = invoices.map(inv => ({
    Number: inv.number,
    Date: inv.invoice_date,
    Client: inv.client_display_name,
    Status: inv.status,
    Amount: inv.total_amount
  }));

  return {
    filename: `Financial_Report_${periodLabel.replace(/ /g, '_')}`,
    sheets: [
      { name: 'Summary', data: summaryData, headers: ['Item', 'Value'] },
      { name: 'Category Totals', data: categoryData, headers: ['Category', 'Amount'] },
      { name: 'Transactions', data: detailedData, headers: ['Date', 'Description', 'Category', 'Subcategory', 'Amount', 'Notes', 'Account'] },
      { name: 'Invoices', data: invoiceData, headers: ['Number', 'Date', 'Client', 'Status', 'Amount'] }
    ]
  };
};