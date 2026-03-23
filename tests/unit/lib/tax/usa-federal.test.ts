/**
 * Tests for USA federal income tax calculator (2025, single filer).
 *
 * TC-tax-us-001 through TC-tax-us-014
 * Verifies: calculateUSAFederalTax, calculateUSAMonthlyNet
 */
import { describe, it, expect } from 'vitest';
import {
  calculateUSAFederalTax,
  calculateUSAMonthlyNet,
} from '../../../../src/lib/tax/usa-federal';

describe('calculateUSAFederalTax', () => {
  it('TC-tax-us-001: returns 0 for zero gross', () => {
    expect(calculateUSAFederalTax(0)).toBe(0);
  });

  it('TC-tax-us-002: returns 0 for negative gross', () => {
    expect(calculateUSAFederalTax(-5000)).toBe(0);
  });

  it('TC-tax-us-003: income below standard deduction (15700) results in 0 tax', () => {
    // taxableIncome = 10000 - 15700 = max(0, -5700) = 0
    expect(calculateUSAFederalTax(10000)).toBe(0);
  });

  it('TC-tax-us-004: applies 10% bracket for income just above standard deduction', () => {
    // annual = 20000, taxable = 20000 - 15700 = 4300
    // bracket 1: min=0, max=11925, rate=10%, baseTax=0
    // tax = 0 + 4300 * 0.10 = 430
    const result = calculateUSAFederalTax(20000);
    expect(result).toBeCloseTo(430, 0);
  });

  it('TC-tax-us-005: applies 12% bracket for middle-income range', () => {
    // annual = 40000, taxable = 40000 - 15700 = 24300
    // bracket 2: min=11925, max=48475, rate=12%, baseTax=1192.50
    // tax = 1192.50 + (24300 - 11925) * 0.12 = 1192.50 + 1485 = 2677.50
    const result = calculateUSAFederalTax(40000);
    expect(result).toBeCloseTo(2677.5, 0);
  });

  it('TC-tax-us-006: applies 22% bracket for higher income', () => {
    // annual = 100000, taxable = 100000 - 15700 = 84300
    // bracket 3: min=48475, max=103350, rate=22%, baseTax=5578.50
    // tax = 5578.50 + (84300 - 48475) * 0.22 = 5578.50 + 7881.50 = 13460
    const result = calculateUSAFederalTax(100000);
    expect(result).toBeCloseTo(13460, 0);
  });

  it('TC-tax-us-007: applies 37% bracket for very high income (700000)', () => {
    // taxable = 700000 - 15700 = 684300
    // bracket 7: min=626350, baseTax=188769.75, rate=37%
    const result = calculateUSAFederalTax(700000);
    expect(result).toBeGreaterThan(188769);
  });
});

describe('calculateUSAMonthlyNet (w2)', () => {
  it('TC-tax-us-008: returns 0 for zero gross', () => {
    expect(calculateUSAMonthlyNet(0, 'w2')).toBe(0);
  });

  it('TC-tax-us-009: returns 0 for negative gross', () => {
    expect(calculateUSAMonthlyNet(-1000, 'w2')).toBe(0);
  });

  it('TC-tax-us-010: net is less than gross for taxable income (w2)', () => {
    const monthly = 8000; // annual = 96000
    const net = calculateUSAMonthlyNet(monthly, 'w2');
    expect(net).toBeLessThan(monthly);
    expect(net).toBeGreaterThan(0);
  });

  it('TC-tax-us-011: deducts federal tax + FICA (7.65%) for w2', () => {
    const monthly = 5000; // annual = 60000
    const annual = 60000;
    const federalTax = calculateUSAFederalTax(annual); // ~6136.50
    const fica = annual * 0.0765; // 4590
    const expectedNet = (annual - federalTax - fica) / 12;
    const result = calculateUSAMonthlyNet(monthly, 'w2');
    expect(result).toBeCloseTo(expectedNet, 1);
  });

  it('TC-tax-us-012: defaults to w2 when regime omitted', () => {
    const monthly = 6000;
    expect(calculateUSAMonthlyNet(monthly)).toBe(calculateUSAMonthlyNet(monthly, 'w2'));
  });
});

describe('calculateUSAMonthlyNet (1099)', () => {
  it('TC-tax-us-013: 1099 net is less than w2 net due to self-employment tax', () => {
    const monthly = 8000;
    const w2Net = calculateUSAMonthlyNet(monthly, 'w2');
    const net1099 = calculateUSAMonthlyNet(monthly, '1099');
    expect(net1099).toBeLessThan(w2Net);
  });

  it('TC-tax-us-014: deducts federal tax + 15.3% self-employment tax for 1099', () => {
    const monthly = 5000;
    const annual = 60000;
    const federalTax = calculateUSAFederalTax(annual);
    const seTax = annual * 0.153;
    const expectedNet = (annual - federalTax - seTax) / 12;
    const result = calculateUSAMonthlyNet(monthly, '1099');
    expect(result).toBeCloseTo(expectedNet, 1);
  });
});
