"use client";

import * as XLSX from 'xlsx';
import { format, parseISO, eachMonthOfInterval, isSameMonth } from 'date-fns';

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
    const maxWidths = sheet.headers.map(h => ({ wch: h.length + 12 }));
    ws['!cols'] = maxWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const prepareAccountantData = (
  transactions: any[], 
  invoices: any[], 
  periodLabel: string, 
  settings: any,
  reportInterval: { start: Date, end: Date }
) => {
  const workTxns = transactions.filter(t => t.is_work);
  const income = workTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = workTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;

  // 1. Summary Sheet (with Business Info)
  const summaryData = [
    { Item: 'BUSINESS DETAILS', Value: '' },
    { Item: 'Entity Name', Value: settings?.company_name || 'Not Set' },
    { Item: 'ABN', Value: settings?.company_abn || 'Not Set' },
    { Item: 'Email', Value: settings?.company_email || 'Not Set' },
    { Item: '', Value: '' },
    { Item: 'REPORT PARAMETERS', Value: '' },
    { Item: 'Period', Value: periodLabel },
    { Item: 'Export Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm') },
    { Item: '', Value: '' },
    { Item: 'FINANCIAL PERFORMANCE', Value: '' },
    { Item: 'Total Business Income', Value: income },
    { Item: 'Total Business Expenses', Value: expenses },
    { Item: 'Net Position (Pre-Tax)', Value: net },
    { Item: '', Value: '' },
    { Item: 'TAX ESTIMATES (Indicative)', Value: '' },
    { Item: 'Estimated Tax (30%)', Value: net > 0 ? net * 0.3 : 0 },
    { Item: 'GST Collected (Est)', Value: income / 11 }, // Simple 1/11th estimate
    { Item: 'GST Credits (Est)', Value: expenses / 11 },
  ];

  // 2. Monthly Matrix (Accountants love this for spotting gaps)
  const months = eachMonthOfInterval({ start: reportInterval.start, end: reportInterval.end });
  const categories = Array.from(new Set(workTxns.map(t => t.category_1).filter(Boolean))).sort();
  
  const matrixData = categories.map(cat => {
    const row: any = { Category: cat };
    let catTotal = 0;
    
    months.forEach(month => {
      const monthLabel = format(month, 'MMM yy');
      const monthTotal = workTxns
        .filter(t => t.category_1 === cat && isSameMonth(parseISO(t.transaction_date), month))
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      
      row[monthLabel] = monthTotal || 0;
      catTotal += monthTotal;
    });
    
    row['TOTAL'] = catTotal;
    return row;
  });

  const matrixHeaders = ['Category', ...months.map(m => format(m, 'MMM yy')), 'TOTAL'];

  // 3. Category & Subcategory Breakdown
  const breakdownData: any[] = [];
  const catTotals: Record<string, { total: number, subs: Record<string, number> }> = {};

  workTxns.filter(t => t.amount < 0).forEach(t => {
    const cat = t.category_1 || 'Uncategorized';
    const sub = t.category_2 || 'General';
    if (!catTotals[cat]) catTotals[cat] = { total: 0, subs: {} };
    catTotals[cat].total += Math.abs(t.amount);
    catTotals[cat].subs[sub] = (catTotals[cat].subs[sub] || 0) + Math.abs(t.amount);
  });

  Object.entries(catTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, data]) => {
      breakdownData.push({ Category: cat, Subcategory: 'TOTAL', Amount: data.total });
      Object.entries(data.subs).forEach(([sub, amt]) => {
        breakdownData.push({ Category: '', Subcategory: sub, Amount: amt });
      });
    });

  // 4. Detailed Transaction Log
  const detailedData = workTxns.map(t => ({
    Date: t.transaction_date,
    Description: t.description,
    Category: t.category_1,
    Subcategory: t.category_2,
    Amount: t.amount,
    Notes: t.notes,
    Account: t.account_label
  }));

  // 5. Invoices
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
      { name: 'Monthly Matrix', data: matrixData, headers: matrixHeaders },
      { name: 'Category Breakdown', data: breakdownData, headers: ['Category', 'Subcategory', 'Amount'] },
      { name: 'Transaction Log', data: detailedData, headers: ['Date', 'Description', 'Category', 'Subcategory', 'Amount', 'Notes', 'Account'] },
      { name: 'Invoices', data: invoiceData, headers: ['Number', 'Date', 'Client', 'Status', 'Amount'] }
    ]
  };
};