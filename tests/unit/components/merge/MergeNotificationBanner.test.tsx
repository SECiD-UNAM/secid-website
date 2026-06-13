/**
 * TC-MERGE-BANNER-001 through TC-MERGE-BANNER-003
 * Unit tests for MergeNotificationBanner component.
 *
 * Tests use separate describe blocks per vitest jsdom contamination pattern
 * documented in MEMORY.md (TD-013).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// vi.mock is hoisted — do NOT reference module-scope variables inside factories
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/merge/mutations', () => ({
  dismissMergeMatch: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => null,
  X: () => null,
}));

import { MergeNotificationBanner } from '@/components/merge/MergeNotificationBanner';
import { useAuth } from '@/contexts/AuthContext';

const mockUseAuth = vi.mocked(useAuth);

describe('MergeNotificationBanner — no potentialMergeMatch', () => {
  /**
   * TC-MERGE-BANNER-001
   * Verifies: banner renders nothing when userProfile has no potentialMergeMatch field
   */
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      userProfile: { email: 'test@test.com' } as any,
      user: { uid: 'test-uid' } as any,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('TC-MERGE-BANNER-001: should render nothing when no potentialMergeMatch', () => {
    const { container } = render(<MergeNotificationBanner lang="en" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('MergeNotificationBanner — dismissed match', () => {
  /**
   * TC-MERGE-BANNER-002
   * Verifies: banner renders nothing when match exists but is already dismissed
   */
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      userProfile: {
        potentialMergeMatch: { matchedUid: 'old-uid', dismissed: true },
      } as any,
      user: { uid: 'test-uid' } as any,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('TC-MERGE-BANNER-002: should render nothing when match is dismissed', () => {
    const { container } = render(<MergeNotificationBanner lang="en" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('MergeNotificationBanner — active match', () => {
  /**
   * TC-MERGE-BANNER-003
   * Verifies: banner renders content when an undismissed match exists
   */
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      userProfile: {
        potentialMergeMatch: {
          matchedUid: 'old-uid',
          numeroCuenta: '12345',
          dismissed: false,
        },
      } as any,
      user: { uid: 'test-uid' } as any,
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  it('TC-MERGE-BANNER-003: should render banner when undismissed match exists', () => {
    render(<MergeNotificationBanner lang="en" />);
    expect(screen.getByText(/existing profile/i)).toBeTruthy();
  });

  it('TC-MERGE-BANNER-004: should render Review Profile and Dismiss buttons', () => {
    cleanup();
    render(<MergeNotificationBanner lang="en" />);
    expect(screen.getAllByText('Review Profile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dismiss').length).toBeGreaterThan(0);
  });

  it('TC-MERGE-BANNER-005: should render Spanish text when lang is es', () => {
    cleanup();
    render(<MergeNotificationBanner lang="es" />);
    expect(screen.getByText(/número de cuenta/i)).toBeTruthy();
    expect(screen.getByText('Revisar Perfil')).toBeTruthy();
    expect(screen.getByText('Descartar')).toBeTruthy();
  });
});
