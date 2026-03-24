// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock the chart view (lazy loaded)
vi.mock('@/components/commissions/CommissionsChartView', () => ({
  default: ({ lang }: any) => <div data-testid="chart-view">Chart: {lang}</div>,
}));

import CommissionOverview from '@/components/commissions/CommissionOverview';

// Per project test infrastructure pattern (see MEMORY.md: jsdom contamination):
// Every test lives in its own describe block with afterEach cleanup to prevent
// concurrent test contamination under vitest's sequence.concurrent: true config.

describe('CommissionOverview renders list view by default', () => {
  afterEach(cleanup);
  it('renders list view by default', () => {
    render(<CommissionOverview lang="es" />);
    expect(screen.getByText('Presidencia')).toBeInTheDocument();
  });
});

describe('CommissionOverview renders toggle with both options', () => {
  afterEach(cleanup);
  it('renders toggle with both options', () => {
    render(<CommissionOverview lang="es" />);
    expect(screen.getByText('Vista detallada')).toBeInTheDocument();
    expect(screen.getByText('Organigrama')).toBeInTheDocument();
  });
});

describe('CommissionOverview switches to chart view when Organigrama is clicked', () => {
  afterEach(cleanup);
  it('switches to chart view when Organigrama is clicked', async () => {
    render(<CommissionOverview lang="es" />);
    fireEvent.click(screen.getByText('Organigrama'));
    await waitFor(() => {
      expect(screen.getByTestId('chart-view')).toBeInTheDocument();
    });
  });
});

describe('CommissionOverview renders English toggle labels when lang=en', () => {
  afterEach(cleanup);
  it('renders English toggle labels when lang=en', () => {
    render(<CommissionOverview lang="en" />);
    expect(screen.getByText('Detailed view')).toBeInTheDocument();
    expect(screen.getByText('Org chart')).toBeInTheDocument();
  });
});
