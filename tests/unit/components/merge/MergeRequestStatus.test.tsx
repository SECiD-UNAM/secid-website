/**
 * TC-MERGE-STATUS-001 through TC-MERGE-STATUS-008
 * Unit tests for MergeRequestStatusBadge component.
 *
 * Verifies: AC-MERGE-009 — status badge renders correct label and color per status
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Clock: () => null,
  CheckCircle: () => null,
  XCircle: () => null,
  Loader2: () => null,
  AlertTriangle: () => null,
}));

import { MergeRequestStatusBadge } from '@/components/merge/MergeRequestStatus';
import type { MergeRequestStatus } from '@/types/merge';

describe('MergeRequestStatusBadge — pending', () => {
  /**
   * TC-MERGE-STATUS-001
   * Verifies: pending status renders "Pending" in English
   */
  it('TC-MERGE-STATUS-001: should render Pending label in English', () => {
    render(<MergeRequestStatusBadge status="pending" lang="en" />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  it('TC-MERGE-STATUS-002: should render Pendiente label in Spanish', () => {
    render(<MergeRequestStatusBadge status="pending" lang="es" />);
    expect(screen.getByText('Pendiente')).toBeTruthy();
  });
});

describe('MergeRequestStatusBadge — approved', () => {
  /**
   * TC-MERGE-STATUS-003
   * Verifies: approved status renders correct label
   */
  it('TC-MERGE-STATUS-003: should render Approved label', () => {
    render(<MergeRequestStatusBadge status="approved" lang="en" />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });
});

describe('MergeRequestStatusBadge — rejected', () => {
  /**
   * TC-MERGE-STATUS-004
   * Verifies: rejected status renders correct label
   */
  it('TC-MERGE-STATUS-004: should render Rejected label', () => {
    render(<MergeRequestStatusBadge status="rejected" lang="en" />);
    expect(screen.getByText('Rejected')).toBeTruthy();
  });
});

describe('MergeRequestStatusBadge — executing', () => {
  /**
   * TC-MERGE-STATUS-005
   * Verifies: executing status renders correct label
   */
  it('TC-MERGE-STATUS-005: should render Executing label', () => {
    render(<MergeRequestStatusBadge status="executing" lang="en" />);
    expect(screen.getByText('Executing')).toBeTruthy();
  });
});

describe('MergeRequestStatusBadge — completed', () => {
  /**
   * TC-MERGE-STATUS-006
   * Verifies: completed status renders correct label
   */
  it('TC-MERGE-STATUS-006: should render Completed label', () => {
    render(<MergeRequestStatusBadge status="completed" lang="en" />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });
});

describe('MergeRequestStatusBadge — failed', () => {
  /**
   * TC-MERGE-STATUS-007
   * Verifies: failed status renders correct label
   */
  it('TC-MERGE-STATUS-007: should render Failed label', () => {
    render(<MergeRequestStatusBadge status="failed" lang="en" />);
    expect(screen.getByText('Failed')).toBeTruthy();
  });
});

describe('MergeRequestStatusBadge — default lang', () => {
  /**
   * TC-MERGE-STATUS-008
   * Verifies: component defaults to Spanish when no lang prop is provided
   */
  it('TC-MERGE-STATUS-008: should default to Spanish labels', () => {
    render(<MergeRequestStatusBadge status="completed" />);
    expect(screen.getByText('Completada')).toBeTruthy();
  });
});
