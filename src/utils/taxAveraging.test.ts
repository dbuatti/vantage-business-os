import { describe, it, expect } from 'vitest';
import { calculateTax, calculateAveragingBenefit, RESIDENT_TAX_RATES_2024_25 } from './taxAveraging';

describe('calculateTax', () => {
  it('returns 0 for income <= 0', () => {
    expect(calculateTax(0)).toBe(0);
    expect(calculateTax(-1000)).toBe(0);
  });

  it('tax-free threshold: $0-$18,200', () => {
    expect(calculateTax(18200)).toBe(0);
    expect(calculateTax(10000)).toBe(0);
  });

  it('16% bracket: $18,201-$45,000', () => {
    const income = 30000;
    const expected = (income - 18200) * 0.16;
    expect(calculateTax(income)).toBeCloseTo(expected, 2);
  });

  it('30% bracket: $45,001-$135,000', () => {
    const income = 80000;
    const expected = 4288 + (income - 45000) * 0.30;
    expect(calculateTax(income)).toBeCloseTo(expected, 2);
  });

  it('37% bracket: $135,001-$190,000', () => {
    const income = 150000;
    const taxableOverThreshold = income - (135001 - 1);
    const expected = 31288 + taxableOverThreshold * 0.37;
    expect(calculateTax(income)).toBeCloseTo(expected, 2);
  });

  it('45% bracket: $190,001+', () => {
    const income = 250000;
    const taxableOverThreshold = income - (190001 - 1);
    const expected = 51638 + taxableOverThreshold * 0.45;
    expect(calculateTax(income)).toBeCloseTo(expected, 2);
  });

  it('uses provided brackets instead of defaults', () => {
    const simpleBrackets = [
      { min: 0, max: 10000, baseTax: 0, rate: 0.10 },
      { min: 10001, max: null, baseTax: 1000, rate: 0.20 },
    ];
    const tax1 = calculateTax(5000, simpleBrackets);
    expect(tax1).toBeGreaterThan(0);
    const tax2 = calculateTax(20000, simpleBrackets);
    expect(tax2).toBeGreaterThan(tax1);
  });
});

describe('calculateAveragingBenefit', () => {
  it('no benefit when current income equals average', () => {
    const result = calculateAveragingBenefit(80000, 60000, [60000, 60000, 60000, 60000]);
    expect(result.averageProfessionalIncome).toBe(60000);
    expect(result.aboveAverageIncome).toBe(0);
    expect(result.taxWithAveraging).toBe(result.taxWithoutAveraging);
    expect(result.taxSaving).toBe(0);
  });

  it('no benefit when current income is below average', () => {
    const result = calculateAveragingBenefit(80000, 40000, [60000, 60000, 60000, 60000]);
    expect(result.aboveAverageIncome).toBe(0);
    expect(result.taxSaving).toBe(0);
  });

  it('calculates average correctly with varying historical incomes', () => {
    const result = calculateAveragingBenefit(100000, 80000, [50000, 60000, 70000, 80000]);
    expect(result.averageProfessionalIncome).toBe(65000);
    expect(result.aboveAverageIncome).toBe(15000);
  });

  it('returns zero taxSaving when averaging would increase tax', () => {
    const result = calculateAveragingBenefit(50000, 30000, [40000, 40000, 40000, 40000]);
    expect(result.taxSaving).toBe(0);
  });

  it('handles zero historical income', () => {
    const result = calculateAveragingBenefit(50000, 50000, [0, 0, 0, 0]);
    expect(result.averageProfessionalIncome).toBe(0);
    expect(result.aboveAverageIncome).toBe(50000);
  });

  it('applies averaging formula correctly (no benefit for low difference)', () => {
    const result = calculateAveragingBenefit(100000, 75000, [70000, 70000, 70000, 70000]);
    expect(result.averageProfessionalIncome).toBe(70000);
    expect(result.aboveAverageIncome).toBe(5000);
    expect(result.taxSaving).toBeGreaterThanOrEqual(0);
    expect(result.taxWithAveraging).toBeGreaterThan(0);
    expect(result.taxWithoutAveraging).toBeGreaterThan(0);
  });
});
