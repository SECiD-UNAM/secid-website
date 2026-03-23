/**
 * Tests for CompensationBreakdown component.
 *
 * TC-salary-breakdown-001 through TC-salary-breakdown-006
 * Verifies: non-base compensation detection, empty state, donut rendering
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import type { SalaryDataPoint } from '../../../../src/components/salary/SalaryInsights';

afterEach(cleanup);

// recharts uses ResizeObserver which is not available in jsdom
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pie-chart' }, children),
  Pie: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'pie' }, children),
  Cell: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

const { CompensationBreakdown } = await import(
  '../../../../src/components/salary/CompensationBreakdown'
);

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

describe('TC-salary-breakdown-001: English no-data message when only base salary', () => {
  it('shows base-only message in English', () => {
    // Arrange
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    // Act
    const { container } = render(
      <CompensationBreakdown dataPoints={dataPoints} lang="en" />
    );
    // Assert
    const msg = within(container).getAllByText(
      'Only base salary data available. Add bonuses or stock to see the breakdown.'
    );
    expect(msg.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-breakdown-002: Spanish no-data message when only base salary', () => {
  it('shows base-only message in Spanish', () => {
    // Arrange
    const dataPoints = [makeDataPoint(), makeDataPoint(), makeDataPoint()];
    // Act
    const { container } = render(
      <CompensationBreakdown dataPoints={dataPoints} lang="es" />
    );
    // Assert
    const msg = within(container).getAllByText(
      'Solo hay datos de salario base. Agrega bonos o stock para ver la composición.'
    );
    expect(msg.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-breakdown-003: renders pie chart when bonus data present', () => {
  it('renders the pie chart component', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint({ annualBonus: 30000 }),
      makeDataPoint({ annualBonus: 30000 }),
      makeDataPoint({ annualBonus: 30000 }),
    ];
    // Act
    const { container } = render(
      <CompensationBreakdown dataPoints={dataPoints} lang="en" />
    );
    // Assert
    const charts = within(container).getAllByTestId('pie-chart');
    expect(charts.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-breakdown-004: shows Base Salary in legend when bonus present', () => {
  it('shows Base Salary label', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint({ annualBonus: 30000 }),
      makeDataPoint({ annualBonus: 30000 }),
      makeDataPoint({ annualBonus: 30000 }),
    ];
    // Act
    const { container } = render(
      <CompensationBreakdown dataPoints={dataPoints} lang="en" />
    );
    // Assert
    const items = within(container).getAllByText('Base Salary');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-breakdown-005: shows Bonus in legend when annual bonus present', () => {
  it('shows Bonus label', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint({ annualBonus: 30000 }),
      makeDataPoint({ annualBonus: 30000 }),
      makeDataPoint({ annualBonus: 30000 }),
    ];
    // Act
    const { container } = render(
      <CompensationBreakdown dataPoints={dataPoints} lang="en" />
    );
    // Assert
    const items = within(container).getAllByText('Bonus');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-breakdown-006: shows Stock in legend when stock data present', () => {
  it('shows Stock label', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint({ stockValue: 50000 }),
      makeDataPoint({ stockValue: 50000 }),
      makeDataPoint({ stockValue: 50000 }),
    ];
    // Act
    const { container } = render(
      <CompensationBreakdown dataPoints={dataPoints} lang="en" />
    );
    // Assert
    const items = within(container).getAllByText('Stock');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});
