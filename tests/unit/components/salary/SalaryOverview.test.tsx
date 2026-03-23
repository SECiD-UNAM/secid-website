/**
 * Tests for SalaryOverview component.
 *
 * TC-salary-overview-001 through TC-salary-overview-004
 * Verifies: stat card rendering, currency formatting, contributor count
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import type { SalaryDataPoint } from '../../../../src/components/salary/SalaryInsights';

afterEach(cleanup);

vi.mock('../../../../src/components/salary/salary-utils', () => ({
  safeAggregate: (values: number[]) => {
    if (values.length < 3) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
      median: sorted[Math.floor(sorted.length / 2)],
      p10: sorted[Math.floor(sorted.length * 0.1)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      count: sorted.length,
    };
  },
}));

const { SalaryOverview } = await import('../../../../src/components/salary/SalaryOverview');

function makeDataPoint(overrides: Partial<SalaryDataPoint> = {}): SalaryDataPoint {
  return {
    monthlyGross: 20000,
    monthlyNet: 15000,
    totalComp: 240000,
    currency: 'MXN',
    country: 'MX',
    experienceLevel: 'mid',
    industry: 'Tecnología',
    benefits: [],
    annualBonus: 0,
    stockValue: 0,
    signOnBonus: 0,
    ...overrides,
  };
}

describe('TC-salary-overview-001: renders Median Monthly Gross label in English', () => {
  it('shows Median Monthly Gross', () => {
    // Arrange
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    // Act
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="en" />);
    // Assert
    const labels = within(container).getAllByText('Median Monthly Gross');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-002: renders Median Annual Total Comp label in English', () => {
  it('shows Median Annual Total Comp', () => {
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="en" />);
    const labels = within(container).getAllByText('Median Annual Total Comp');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-003: renders Data Points label in English', () => {
  it('shows Data Points', () => {
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="en" />);
    const labels = within(container).getAllByText('Data Points');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-004: renders Contributors label in English', () => {
  it('shows Contributors', () => {
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="en" />);
    const labels = within(container).getAllByText('Contributors');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-005: Spanish label for gross when lang=es', () => {
  it('shows Salario Bruto Mensual (Mediana)', () => {
    // Arrange
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    // Act
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="es" />);
    // Assert
    const labels = within(container).getAllByText('Salario Bruto Mensual (Mediana)');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-006: Spanish label for data points when lang=es', () => {
  it('shows Puntos de Datos', () => {
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="es" />);
    const labels = within(container).getAllByText('Puntos de Datos');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-007: shows correct data point count', () => {
  it('shows 4 as data points count', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint(),
      makeDataPoint(),
      makeDataPoint(),
      makeDataPoint(),
    ];
    // Act
    const { container } = render(<SalaryOverview dataPoints={dataPoints} lang="en" />);
    // Assert
    const countEl = within(container).getAllByText('4');
    expect(countEl.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-008: renders without crashing on empty data', () => {
  it('empty dataPoints renders Median Monthly Gross card', () => {
    // Arrange / Act
    const { container } = render(<SalaryOverview dataPoints={[]} lang="en" />);
    // Assert
    const labels = within(container).getAllByText('Median Monthly Gross');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});
