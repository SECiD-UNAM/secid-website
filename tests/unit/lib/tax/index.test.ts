/**
 * Tests for unified tax API (calculateNetSalary, calculateTotalCompensation).
 *
 * TC-tax-api-001 through TC-tax-api-012
 * Verifies: calculateNetSalary country routing, calculateTotalCompensation bonus types
 */
import { describe, it, expect } from 'vitest';
import { calculateNetSalary, calculateTotalCompensation } from '../../../../src/lib/tax/index';

describe('calculateNetSalary', () => {
  it('TC-tax-api-001: routes MX country to Mexico ISR calculator', () => {
    const result = calculateNetSalary(20000, 'MX', 'asalariado');
    expect(result.monthlyNet).toBeLessThan(20000);
    expect(result.monthlyNet).toBeGreaterThan(0);
  });

  it('TC-tax-api-002: routes US country to USA federal calculator', () => {
    const result = calculateNetSalary(8000, 'US', 'w2');
    expect(result.monthlyNet).toBeLessThan(8000);
    expect(result.monthlyNet).toBeGreaterThan(0);
  });

  it('TC-tax-api-003: OTHER country returns gross as net (no tax calc)', () => {
    const monthly = 5000;
    const result = calculateNetSalary(monthly, 'OTHER');
    expect(result.monthlyNet).toBe(monthly);
  });

  it('TC-tax-api-004: annualGross is monthlyGross * 12', () => {
    const result = calculateNetSalary(10000, 'MX');
    expect(result.annualGross).toBe(120000);
  });

  it('TC-tax-api-005: annualNet is monthlyNet * 12', () => {
    const result = calculateNetSalary(10000, 'MX', 'asalariado');
    expect(result.annualNet).toBeCloseTo(result.monthlyNet * 12, 1);
  });

  it('TC-tax-api-006: results are rounded to 2 decimal places', () => {
    const result = calculateNetSalary(15000, 'MX', 'asalariado');
    const decimalPlaces = (n: number) => {
      const parts = n.toString().split('.');
      return parts[1]?.length ?? 0;
    };
    expect(decimalPlaces(result.monthlyNet)).toBeLessThanOrEqual(2);
    expect(decimalPlaces(result.annualGross)).toBeLessThanOrEqual(2);
    expect(decimalPlaces(result.annualNet)).toBeLessThanOrEqual(2);
  });

  it('TC-tax-api-007: defaults MX regime to asalariado when omitted', () => {
    const withDefault = calculateNetSalary(25000, 'MX');
    const explicit = calculateNetSalary(25000, 'MX', 'asalariado');
    expect(withDefault.monthlyNet).toBe(explicit.monthlyNet);
  });

  it('TC-tax-api-008: defaults US regime to w2 when omitted', () => {
    const withDefault = calculateNetSalary(6000, 'US');
    const explicit = calculateNetSalary(6000, 'US', 'w2');
    expect(withDefault.monthlyNet).toBe(explicit.monthlyNet);
  });
});

describe('calculateTotalCompensation', () => {
  it('TC-tax-api-009: returns annual base only when no extras provided', () => {
    const result = calculateTotalCompensation(10000);
    expect(result).toBe(120000);
  });

  it('TC-tax-api-010: adds fixed bonus as-is', () => {
    const result = calculateTotalCompensation(10000, 30000, 'fixed');
    expect(result).toBe(150000); // 120000 + 30000
  });

  it('TC-tax-api-011: calculates percentage bonus from annual base', () => {
    // 10% of 120000 = 12000
    const result = calculateTotalCompensation(10000, 10, 'percentage');
    expect(result).toBe(132000);
  });

  it('TC-tax-api-012: includes sign-on bonus and stock in total', () => {
    // base=120000, fixedBonus=10000, signOn=5000, stock=20000
    const result = calculateTotalCompensation(10000, 10000, 'fixed', 5000, 20000);
    expect(result).toBe(155000);
  });
});
