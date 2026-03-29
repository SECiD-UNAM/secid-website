// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock @xyflow/react since it needs a browser DOM with measurements
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, edges }: any) => (
    <div data-testid="reactflow" data-node-count={nodes?.length} data-edge-count={edges?.length}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="rf-background" />,
  Controls: () => <div data-testid="rf-controls" />,
  MiniMap: () => <div data-testid="rf-minimap" />,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNodesState: (initial: any) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: any) => [initial, vi.fn(), vi.fn()],
}));

import CommissionsChartView from '@/components/commissions/CommissionsChartView';

describe.sequential('CommissionsChartView', () => {
  it('renders ReactFlow with correct node count (12)', () => {
    render(<CommissionsChartView lang="es" />);
    const rf = screen.getByTestId('reactflow');
    expect(rf.getAttribute('data-node-count')).toBe('12');
  });

  it('renders ReactFlow with correct edge count (4)', () => {
    render(<CommissionsChartView lang="es" />);
    const rf = screen.getByTestId('reactflow');
    expect(rf.getAttribute('data-edge-count')).toBe('4');
  });

  it('includes minimap and controls', () => {
    render(<CommissionsChartView lang="es" />);
    expect(screen.getByTestId('rf-minimap')).toBeInTheDocument();
    expect(screen.getByTestId('rf-controls')).toBeInTheDocument();
  });
});
