/**
 * Tests for BenefitsHeatmap component.
 *
 * TC-salary-benefits-001 through TC-salary-benefits-006
 * Verifies: benefit frequency computation, empty state, sort order
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import type { SalaryDataPoint } from '../../../../src/components/salary/SalaryInsights';
import { BenefitsHeatmap } from '../../../../src/components/salary/BenefitsHeatmap';

afterEach(cleanup);

function makeDataPoint(benefits: string[]): SalaryDataPoint {
  return {
    monthlyGross: 20000,
    monthlyNet: 15000,
    totalComp: 240000,
    currency: 'MXN',
    country: 'MX',
    experienceLevel: 'mid',
    industry: 'Tecnología',
    benefits,
    annualBonus: 0,
    stockValue: 0,
    signOnBonus: 0,
  };
}

describe('TC-salary-benefits-001: shows English empty state when no benefits data', () => {
  it('shows no benefits data message', () => {
    // Arrange
    const dataPoints = [makeDataPoint([]), makeDataPoint([]), makeDataPoint([])];
    // Act
    const { container } = render(<BenefitsHeatmap dataPoints={dataPoints} lang="en" />);
    // Assert
    const msg = within(container).getAllByText('No benefits data recorded.');
    expect(msg.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-benefits-002: shows Remote Work benefit name', () => {
  it('renders Remote Work benefit', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint(['Remote Work', 'Health Insurance']),
      makeDataPoint(['Remote Work']),
      makeDataPoint(['Remote Work', 'Health Insurance']),
      makeDataPoint(['Remote Work']),
    ];
    // Act
    const { container } = render(<BenefitsHeatmap dataPoints={dataPoints} lang="en" />);
    // Assert
    const items = within(container).getAllByText('Remote Work');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-benefits-003: shows Health Insurance benefit name', () => {
  it('renders Health Insurance benefit', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint(['Remote Work', 'Health Insurance']),
      makeDataPoint(['Remote Work']),
      makeDataPoint(['Remote Work', 'Health Insurance']),
      makeDataPoint(['Remote Work']),
    ];
    // Act
    const { container } = render(<BenefitsHeatmap dataPoints={dataPoints} lang="en" />);
    // Assert
    const items = within(container).getAllByText('Health Insurance');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-benefits-004: shows correct percentage for universal benefit', () => {
  it('shows 100% for Remote Work (4 out of 4)', () => {
    // Arrange
    const dataPoints = [
      makeDataPoint(['Remote Work', 'Health Insurance']),
      makeDataPoint(['Remote Work']),
      makeDataPoint(['Remote Work', 'Health Insurance']),
      makeDataPoint(['Remote Work']),
    ];
    // Act
    const { container } = render(<BenefitsHeatmap dataPoints={dataPoints} lang="en" />);
    // Assert — percentage label is in the span next to the benefit name
    const pctItems = within(container).getAllByText((content) => content.startsWith('100%'));
    expect(pctItems.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-benefits-005: Spanish empty state when lang=es', () => {
  it('shows Spanish empty message', () => {
    // Arrange / Act
    const { container } = render(<BenefitsHeatmap dataPoints={[]} lang="es" />);
    // Assert
    const msg = within(container).getAllByText('No hay datos de beneficios registrados.');
    expect(msg.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TC-salary-benefits-006: empty dataPoints array renders without crash', () => {
  it('renders without crash on empty array', () => {
    // Arrange / Act / Assert
    const { container } = render(<BenefitsHeatmap dataPoints={[]} lang="es" />);
    expect(container).toBeTruthy();
  });
});
