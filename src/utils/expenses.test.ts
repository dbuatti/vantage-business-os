import { describe, it, expect } from 'vitest';
import { computeExpenseBreakdown } from './expenses';

const makeTx = (overrides: Partial<{
  amount: number;
  description: string;
  transaction_date: string;
  category_1: string;
  category_2: string;
}> = {}) => ({
  amount: -50,
  description: 'Test transaction',
  transaction_date: '2024-06-15',
  category_1: 'General',
  category_2: '',
  ...overrides,
});

describe('computeExpenseBreakdown', () => {
  it('returns all zeros for empty transactions', () => {
    const result = computeExpenseBreakdown([]);
    expect(result.bigHits.total).toBe(0);
    expect(result.bigHits.items).toHaveLength(0);
    expect(result.subscriptions.total).toBe(0);
    expect(result.dailyLife.total).toBe(0);
    expect(result.smallStuff.total).toBe(0);
  });

  it('ignores positive amounts (income)', () => {
    const txns = [makeTx({ amount: 500 })];
    const result = computeExpenseBreakdown(txns);
    expect(result.bigHits.total).toBe(0);
    expect(result.dailyLife.total).toBe(0);
  });

  it('classifies expenses >= $100 as bigHits', () => {
    const txns = [makeTx({ amount: -150 })];
    const result = computeExpenseBreakdown(txns);
    expect(result.bigHits.total).toBe(150);
    expect(result.bigHits.items).toHaveLength(1);
  });

  it('classifies subscription category as subscriptions', () => {
    const txns = [makeTx({ category_1: 'Subscription' })];
    const result = computeExpenseBreakdown(txns);
    expect(result.subscriptions.total).toBe(50);
    expect(result.subscriptions.items).toHaveLength(1);
  });

  it('classifies subscription subcategory as subscriptions', () => {
    const txns = [makeTx({ category_2: 'Subscription' })];
    const result = computeExpenseBreakdown(txns);
    expect(result.subscriptions.total).toBe(50);
    expect(result.subscriptions.items).toHaveLength(1);
  });

  it('prioritizes subscription over bigHits', () => {
    const txns = [makeTx({ amount: -200, category_1: 'Subscription' })];
    const result = computeExpenseBreakdown(txns);
    expect(result.subscriptions.total).toBe(200);
    expect(result.bigHits.total).toBe(0);
  });

  it('classifies expenses < $20 as smallStuff', () => {
    const txns = [makeTx({ amount: -15 })];
    const result = computeExpenseBreakdown(txns);
    expect(result.smallStuff.total).toBe(15);
    expect(result.smallStuff.items).toHaveLength(1);
  });

  it('classifies remaining expenses as dailyLife', () => {
    const txns = [makeTx({ amount: -50 })];
    const result = computeExpenseBreakdown(txns);
    expect(result.dailyLife.total).toBe(50);
    expect(result.dailyLife.items).toHaveLength(1);
  });

  it('handles mixed transactions correctly', () => {
    const txns = [
      makeTx({ amount: -250, description: 'Rent' }),
      makeTx({ amount: -15, description: 'Coffee' }),
      makeTx({ amount: -45, description: 'Groceries' }),
      makeTx({ amount: -30, description: 'Netflix', category_1: 'Subscription' }),
      makeTx({ amount: 2000, description: 'Salary' }),
    ];
    const result = computeExpenseBreakdown(txns);

    expect(result.bigHits.total).toBe(250);
    expect(result.bigHits.items).toHaveLength(1);
    expect(result.bigHits.items[0].description).toBe('Rent');

    expect(result.subscriptions.total).toBe(30);
    expect(result.subscriptions.items[0].description).toBe('Netflix');

    expect(result.dailyLife.total).toBe(45);
    expect(result.dailyLife.items[0].description).toBe('Groceries');

    expect(result.smallStuff.total).toBe(15);
    expect(result.smallStuff.items[0].description).toBe('Coffee');

    expect(result.smallStuff.total + result.dailyLife.total + result.bigHits.total + result.subscriptions.total).toBe(340);
  });

  it('handles null/undefined categories gracefully', () => {
    const txns = [
      makeTx({ category_1: undefined as unknown as string }),
      makeTx({ category_2: undefined as unknown as string }),
    ];
    const result = computeExpenseBreakdown(txns);
    expect(result.dailyLife.total).toBe(100);
  });

  it('buckets are mutually exclusive', () => {
    const txns = [
      makeTx({ amount: -10 }),
      makeTx({ amount: -30 }),
      makeTx({ amount: -100 }),
      makeTx({ amount: -200, category_1: 'Subscription' }),
    ];
    const result = computeExpenseBreakdown(txns);
    const sum = result.bigHits.total + result.subscriptions.total + result.dailyLife.total + result.smallStuff.total;
    const totalExpenses = 10 + 30 + 100 + 200;
    expect(sum).toBe(totalExpenses);
  });
});
