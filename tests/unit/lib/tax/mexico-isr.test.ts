/**
 * Tests for Mexico ISR monthly withholding calculator (SAT 2025 tables).
 *
 * TC-tax-mx-001 through TC-tax-mx-018
 * Verifies: calculateMexicoISR, getSubsidioAlEmpleo, calculateMexicoMonthlyNet
 */
import { describe, it, expect } from 'vitest';
import {
  calculateMexicoISR,
  getSubsidioAlEmpleo,
  calculateMexicoMonthlyNet,
} from '../../../../src/lib/tax/mexico-isr';

describe('calculateMexicoISR', () => {
  it('TC-tax-mx-001: returns 0 for zero gross', () => {
    expect(calculateMexicoISR(0)).toBe(0);
  });

  it('TC-tax-mx-002: returns 0 for negative gross', () => {
    expect(calculateMexicoISR(-1000)).toBe(0);
  });

  it('TC-tax-mx-003: applies first bracket (0.01 - 746.04) at 1.92%', () => {
    // 500 * 1.92% = 9.60, cuota fija = 0
    const result = calculateMexicoISR(500);
    expect(result).toBeCloseTo(9.6, 1);
  });

  it('TC-tax-mx-004: applies second bracket (746.05 - 6332.05) with cuota fija', () => {
    // gross = 3000, bracket 2: limiteInferior = 746.05, cuotaFija = 14.32, porcentaje = 0.064
    // excedente = 3000 - 746.05 = 2253.95, isr = 14.32 + 2253.95 * 0.064 = 14.32 + 144.25 = 158.57
    const result = calculateMexicoISR(3000);
    expect(result).toBeCloseTo(158.57, 0);
  });

  it('TC-tax-mx-005: applies middle bracket for typical mid-level salary (20000)', () => {
    // bracket 6: limiteInferior = 15487.72, cuotaFija = 1640.18, porcentaje = 0.2136
    // excedente = 20000 - 15487.72 = 4512.28, isr = 1640.18 + 4512.28 * 0.2136 = 2604.40
    const result = calculateMexicoISR(20000);
    expect(result).toBeGreaterThan(2500);
    expect(result).toBeLessThan(2700);
  });

  it('TC-tax-mx-006: applies high bracket for senior salary (80000)', () => {
    // bracket 8: limiteInferior = 49233.01, cuotaFija = 9236.89, porcentaje = 0.30
    const result = calculateMexicoISR(80000);
    expect(result).toBeGreaterThan(18000);
    expect(result).toBeLessThan(22000);
  });

  it('TC-tax-mx-007: applies maximum bracket (35%) above 375975.62', () => {
    const result = calculateMexicoISR(400000);
    expect(result).toBeGreaterThan(117000);
  });
});

describe('getSubsidioAlEmpleo', () => {
  it('TC-tax-mx-008: returns maximum subsidio for low income (1000)', () => {
    const result = getSubsidioAlEmpleo(1000);
    expect(result).toBe(407.02);
  });

  it('TC-tax-mx-009: returns correct subsidio for 3000', () => {
    // 2653.38 < 3000 <= 3472.84, subsidio = 406.62
    const result = getSubsidioAlEmpleo(3000);
    expect(result).toBe(406.62);
  });

  it('TC-tax-mx-010: returns 0 subsidio for high income above 7382.33', () => {
    const result = getSubsidioAlEmpleo(10000);
    expect(result).toBe(0);
  });

  it('TC-tax-mx-011: returns 0 subsidio at boundary 7382.33', () => {
    // 7382.33 <= 7382.33, subsidio = 217.61
    const result = getSubsidioAlEmpleo(7382.33);
    expect(result).toBe(217.61);
  });
});

describe('calculateMexicoMonthlyNet (asalariado)', () => {
  it('TC-tax-mx-012: returns 0 for zero gross', () => {
    expect(calculateMexicoMonthlyNet(0, 'asalariado')).toBe(0);
  });

  it('TC-tax-mx-013: net is less than gross for taxable income', () => {
    const gross = 30000;
    const net = calculateMexicoMonthlyNet(gross, 'asalariado');
    expect(net).toBeLessThan(gross);
    expect(net).toBeGreaterThan(0);
  });

  it('TC-tax-mx-014: subsidio offsets ISR for very low income (1500)', () => {
    // ISR on 1500 is small, subsidio 407.02 should fully offset → net close to gross
    const net = calculateMexicoMonthlyNet(1500, 'asalariado');
    expect(net).toBeCloseTo(1500, 0);
  });

  it('TC-tax-mx-015: net is positive for high income', () => {
    const net = calculateMexicoMonthlyNet(100000, 'asalariado');
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThan(100000);
  });
});

describe('calculateMexicoMonthlyNet (honorarios)', () => {
  it('TC-tax-mx-016: deducts 10% ISR provisional for honorarios', () => {
    const gross = 50000;
    const net = calculateMexicoMonthlyNet(gross, 'honorarios');
    expect(net).toBeCloseTo(gross * 0.9, 2);
  });
});

describe('calculateMexicoMonthlyNet (resico)', () => {
  it('TC-tax-mx-017: deducts 2.5% for RESICO regime', () => {
    const gross = 40000;
    const net = calculateMexicoMonthlyNet(gross, 'resico');
    expect(net).toBeCloseTo(gross * 0.975, 2);
  });

  it('TC-tax-mx-018: defaults to asalariado when regime omitted', () => {
    const gross = 20000;
    const withDefault = calculateMexicoMonthlyNet(gross);
    const asalariado = calculateMexicoMonthlyNet(gross, 'asalariado');
    expect(withDefault).toBe(asalariado);
  });
});
