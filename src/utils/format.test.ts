import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, parseNumericInput } from './format';

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero without trailing zeros when minimumFractionDigits is 0', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('formats whole numbers without decimals', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1000000.50)).toBe('$1,000,000.5');
  });

  it('includes sign when includeSign is true', () => {
    expect(formatCurrency(100, true)).toBe('+$100');
  });

  it('includes sign for negative when includeSign is true', () => {
    expect(formatCurrency(-100, true)).toBe('-$100');
  });

  it('handles small amounts', () => {
    expect(formatCurrency(0.01)).toBe('$0.01');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date string', () => {
    expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
  });

  it('returns placeholder for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('returns raw string for invalid dates', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('accepts custom format string', () => {
    expect(formatDate('2024-01-15', 'yyyy-MM-dd')).toBe('2024-01-15');
  });
});

describe('parseNumericInput', () => {
  it('parses a plain number string', () => {
    expect(parseNumericInput('1234.56')).toBe(1234.56);
  });

  it('parses with dollar sign prefix', () => {
    expect(parseNumericInput('$500')).toBe(500);
  });

  it('parses with commas', () => {
    expect(parseNumericInput('1,234.56')).toBe(1234.56);
  });

  it('parses with dollar sign and commas', () => {
    expect(parseNumericInput('$1,234.56')).toBe(1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseNumericInput('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseNumericInput('abc')).toBe(0);
  });

  it('parses with spaces', () => {
    expect(parseNumericInput('1 234')).toBe(1234);
  });
});
