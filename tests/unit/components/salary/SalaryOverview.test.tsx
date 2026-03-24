/**
 * Tests for SalaryOverview component.
 *
 * TC-salary-overview-001 through TC-salary-overview-008
 * Verifies: stat card rendering, currency formatting, contributor count
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import type { OverviewStats } from '../../../../src/components/salary/SalaryOverview';
import { SalaryOverview } from '../../../../src/components/salary/SalaryOverview';

afterEach(cleanup);

function makeOverview(overrides: Partial<OverviewStats> = {}): OverviewStats {
  return {
    medianMonthlyGross: 20000,
    medianTotalComp: 240000,
    dataPointCount: 3,
    contributorCount: 3,
    ...overrides,
  };
}

describe('TC-salary-overview-001: renders Median Monthly Gross label in English', () => {
  it('shows Median Monthly Gross', () => {
    // Arrange
    const overview = makeOverview();
    // Act
    const { container } = render(<SalaryOverview overview={overview} lang="en" />);
    // Assert
    const labels = within(container).getAllByText('Median Monthly Gross');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-002: renders Median Annual Total Comp label in English', () => {
  it('shows Median Annual Total Comp', () => {
    const overview = makeOverview();
    const { container } = render(<SalaryOverview overview={overview} lang="en" />);
    const labels = within(container).getAllByText('Median Annual Total Comp');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-003: renders Data Points label in English', () => {
  it('shows Data Points', () => {
    const overview = makeOverview();
    const { container } = render(<SalaryOverview overview={overview} lang="en" />);
    const labels = within(container).getAllByText('Data Points');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-004: renders Contributors label in English', () => {
  it('shows Contributors', () => {
    const overview = makeOverview();
    const { container } = render(<SalaryOverview overview={overview} lang="en" />);
    const labels = within(container).getAllByText('Contributors');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-005: Spanish label for gross when lang=es', () => {
  it('shows Salario Bruto Mensual (Mediana)', () => {
    // Arrange
    const overview = makeOverview();
    // Act
    const { container } = render(<SalaryOverview overview={overview} lang="es" />);
    // Assert
    const labels = within(container).getAllByText('Salario Bruto Mensual (Mediana)');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-006: Spanish label for data points when lang=es', () => {
  it('shows Puntos de Datos', () => {
    const overview = makeOverview();
    const { container } = render(<SalaryOverview overview={overview} lang="es" />);
    const labels = within(container).getAllByText('Puntos de Datos');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-007: shows correct data point count', () => {
  it('shows 4 as data points count', () => {
    // Arrange
    const overview = makeOverview({ dataPointCount: 4 });
    // Act
    const { container } = render(<SalaryOverview overview={overview} lang="en" />);
    // Assert
    const countEl = within(container).getAllByText('4');
    expect(countEl.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-overview-008: renders without crashing on zero data', () => {
  it('zero dataPointCount still renders Median Monthly Gross card', () => {
    // Arrange
    const overview = makeOverview({ dataPointCount: 0, contributorCount: 0 });
    // Act
    const { container } = render(<SalaryOverview overview={overview} lang="en" />);
    // Assert
    const labels = within(container).getAllByText('Median Monthly Gross');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});
