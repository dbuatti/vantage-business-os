import { describe, it, expect } from 'vitest';
import { prepareAccountantData } from './excelExport';

describe('prepareAccountantData', () => {
  const defaultSettings = { company_name: 'Test Co', company_abn: '123456789', company_email: 'test@test.com' };
  const interval = { start: new Date('2024-01-01'), end: new Date('2024-03-31') };

  it('calculates income, expenses, and net correctly', () => {
    const transactions = [
      { is_work: true, amount: 10000, category_1: 'Income', transaction_date: '2024-01-15' },
      { is_work: true, amount: -2000, category_1: 'Office', transaction_date: '2024-01-20' },
      { is_work: true, amount: -500, category_1: 'Software', transaction_date: '2024-02-10' },
    ];
    const result = prepareAccountantData(transactions, [], 'Q1 2024', defaultSettings, interval);

    const summarySheet = result.sheets.find(s => s.name === 'Summary');
    const summary = summarySheet!.data as Record<string, unknown>[];

    const income = summary.find(r => r.Item === 'Total Business Income')!.Value;
    const expenses = summary.find(r => r.Item === 'Total Business Expenses')!.Value;
    const net = summary.find(r => r.Item === 'Net Position (Pre-Tax)')!.Value;

    expect(income).toBe(10000);
    expect(expenses).toBe(2500);
    expect(net).toBe(7500);
  });

  it('filters out non-work transactions', () => {
    const transactions = [
      { is_work: true, amount: 5000, category_1: 'Income', transaction_date: '2024-01-15' },
      { is_work: false, amount: -1000, category_1: 'Personal', transaction_date: '2024-01-20' },
    ];
    const result = prepareAccountantData(transactions, [], 'Q1 2024', defaultSettings, interval);

    const summarySheet = result.sheets.find(s => s.name === 'Summary')!;
    const summary = summarySheet.data as Record<string, unknown>[];
    const expenses = summary.find(r => r.Item === 'Total Business Expenses')!.Value;

    expect(expenses).toBe(0);
  });

  it('estimates tax at 30% of net', () => {
    const transactions = [
      { is_work: true, amount: 50000, category_1: 'Income', transaction_date: '2024-02-01' },
      { is_work: true, amount: -10000, category_1: 'Expenses', transaction_date: '2024-02-15' },
    ];
    const result = prepareAccountantData(transactions, [], 'Q1 2024', defaultSettings, interval);

    const summarySheet = result.sheets.find(s => s.name === 'Summary')!;
    const summary = summarySheet.data as Record<string, unknown>[];
    const estimatedTax = summary.find(r => r.Item === 'Estimated Tax (30%)')!.Value;

    expect(estimatedTax).toBe(12000);
  });

  it('estimates GST at 1/11th', () => {
    const transactions = [
      { is_work: true, amount: 55000, category_1: 'Income', transaction_date: '2024-02-01' },
      { is_work: true, amount: -11000, category_1: 'Expenses', transaction_date: '2024-02-15' },
    ];
    const result = prepareAccountantData(transactions, [], 'Q1 2024', defaultSettings, interval);

    const summarySheet = result.sheets.find(s => s.name === 'Summary')!;
    const summary = summarySheet.data as Record<string, unknown>[];
    const gstCollected = summary.find(r => r.Item === 'GST Collected (Est)')!.Value;
    const gstCredits = summary.find(r => r.Item === 'GST Credits (Est)')!.Value;

    expect(gstCollected).toBeCloseTo(5000, 2);
    expect(gstCredits).toBeCloseTo(1000, 2);
  });

  it('returns 0 estimated tax when net is negative', () => {
    const transactions = [
      { is_work: true, amount: 1000, category_1: 'Income', transaction_date: '2024-02-01' },
      { is_work: true, amount: -5000, category_1: 'Expenses', transaction_date: '2024-02-15' },
    ];
    const result = prepareAccountantData(transactions, [], 'Q1 2024', defaultSettings, interval);

    const summarySheet = result.sheets.find(s => s.name === 'Summary')!;
    const summary = summarySheet.data as Record<string, unknown>[];
    const estimatedTax = summary.find(r => r.Item === 'Estimated Tax (30%)')!.Value;

    expect(estimatedTax).toBe(0);
  });

  it('generates correct filename', () => {
    const result = prepareAccountantData([], [], 'Q1 2024', defaultSettings, interval);
    expect(result.filename).toContain('Financial_Report');
    expect(result.filename).toContain('Q1_2024');
  });

  it('includes all 5 sheets', () => {
    const result = prepareAccountantData([], [], 'Q1 2024', defaultSettings, interval);
    expect(result.sheets).toHaveLength(5);
    expect(result.sheets.map(s => s.name)).toEqual([
      'Summary', 'Monthly Matrix', 'Category Breakdown', 'Transaction Log', 'Invoices'
    ]);
  });

  it('groups category breakdown by total descending', () => {
    const transactions = [
      { is_work: true, amount: -500, category_1: 'Travel', category_2: 'Flights', transaction_date: '2024-01-15' },
      { is_work: true, amount: -1000, category_1: 'Software', category_2: 'SaaS', transaction_date: '2024-01-20' },
      { is_work: true, amount: -300, category_1: 'Travel', category_2: 'Hotel', transaction_date: '2024-02-10' },
    ];
    const result = prepareAccountantData(transactions, [], 'Q1 2024', defaultSettings, interval);

    const breakdownSheet = result.sheets.find(s => s.name === 'Category Breakdown')!;
    const breakdown = breakdownSheet.data as Record<string, unknown>[];

    const softwareTotal = breakdown.find(r => r.Category === 'Software' && r.Subcategory === 'TOTAL');
    expect(softwareTotal!.Amount).toBe(1000);

    const travelTotal = breakdown.find(r => r.Category === 'Travel' && r.Subcategory === 'TOTAL');
    expect(travelTotal!.Amount).toBe(800);
  });
});
