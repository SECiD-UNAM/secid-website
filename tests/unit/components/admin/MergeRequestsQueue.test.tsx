/**
 * TC-MERGE-QUEUE-001 through TC-MERGE-QUEUE-008
 * Unit tests for MergeRequestsQueue component.
 *
 * Verifies: AC-MERGE-010 — admin can list, filter, review, approve, reject, and retry merge requests
 *
 * NOTE: vi.mock() calls are hoisted before variable declarations. All factory code is inlined —
 * no module-scope variables referenced inside factories (known vitest hoisting constraint).
 * Snapshot callbacks are captured via globalThis. All snapshot emissions are wrapped in act()
 * to flush React state updates.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('lucide-react', () => {
  const stub = () => null;
  return {
    Loader2: stub,
    Eye: stub,
    XCircle: stub,
    CheckCircle: stub,
    RefreshCw: stub,
  };
});

vi.mock('@/lib/firebase', () => ({
  db: {},
  isUsingMockAPI: () => false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'admin-uid-123' } }),
}));

vi.mock('@/components/merge/ProfileComparison', () => ({
  ProfileComparison: ({ lang }: { lang: string }) => (
    <div data-testid="profile-comparison" data-lang={lang} />
  ),
}));

vi.mock('@/components/merge/MergeRequestStatus', () => ({
  MergeRequestStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge" data-status={status}>{status}</span>
  ),
}));

// Store snapshot callback on globalThis to avoid vi.mock hoisting issues
vi.mock('firebase/firestore', () => {
  (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };

  return {
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({ id: 'doc-id-123' })),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
    updateDoc: vi.fn(() => Promise.resolve()),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    onSnapshot: vi.fn((_q: any, onNext: any) => {
      (globalThis as any).__mqCallbacks.onSnapshot = onNext;
      return (globalThis as any).__mqCallbacks.unsubscribe;
    }),
    query: vi.fn((...args: any[]) => args[0]),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
  };
});

import { MergeRequestsQueue } from '@/components/admin/MergeRequestsQueue';

function makeRequest(overrides: Partial<any> = {}): any {
  return {
    id: 'req-001',
    numeroCuenta: '317123456',
    sourceUid: 'source-uid-aabbccdd',
    targetUid: 'target-uid-eeffgghh',
    status: 'pending',
    fieldSelections: {},
    migrateReferences: true,
    oldDocAction: 'soft-delete',
    reviewNotes: '',
    ...overrides,
  };
}

function emitSnapshot(docs: any[]) {
  const cb: Function | undefined = (globalThis as any).__mqCallbacks?.onSnapshot;
  if (cb) {
    cb({ docs: docs.map((d: any) => ({ data: () => d })) });
  }
}

describe.sequential('MergeRequestsQueue — loading state', () => {
  /**
   * TC-MERGE-QUEUE-001
   * Verifies: component shows loading indicator before snapshot arrives
   */
  it('TC-MERGE-QUEUE-001: shows loading spinner before data arrives', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    // onSnapshot has not called back yet — component is in loading state
    expect(screen.getByText('Loading requests...')).toBeTruthy();
  });
});

describe.sequential('MergeRequestsQueue — empty state', () => {
  /**
   * TC-MERGE-QUEUE-002
   * Verifies: empty message shown when snapshot returns no docs
   */
  it('TC-MERGE-QUEUE-002: shows empty state after snapshot with no docs', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    act(() => emitSnapshot([]));
    expect(screen.getByText('No merge requests found.')).toBeTruthy();
  });
});

describe.sequential('MergeRequestsQueue — list rendering', () => {
  /**
   * TC-MERGE-QUEUE-003
   * Verifies: numeroCuenta is rendered for each request
   */
  it('TC-MERGE-QUEUE-003: renders numeroCuenta for each request', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    act(() => emitSnapshot([makeRequest({ numeroCuenta: '317123456' })]));
    expect(screen.getByText('317123456')).toBeTruthy();
  });
});

describe.sequential('MergeRequestsQueue — pending review button', () => {
  /**
   * TC-MERGE-QUEUE-004
   * Verifies: Review button is shown for pending requests
   */
  it('TC-MERGE-QUEUE-004: shows Review button for pending request', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    act(() => emitSnapshot([makeRequest({ status: 'pending' })]));
    expect(screen.getByText('Review')).toBeTruthy();
  });
});

describe.sequential('MergeRequestsQueue — failed retry button', () => {
  /**
   * TC-MERGE-QUEUE-005
   * Verifies: Retry button is shown for failed requests, not Review
   */
  it('TC-MERGE-QUEUE-005: shows Retry button for failed request and no Review button', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    act(() => emitSnapshot([makeRequest({ status: 'failed', error: 'Engine timeout' })]));
    expect(screen.getByText('Retry')).toBeTruthy();
    expect(screen.queryByText('Review')).toBeNull();
  });
});

describe.sequential('MergeRequestsQueue — error message in list', () => {
  /**
   * TC-MERGE-QUEUE-006
   * Verifies: error field from request is displayed in the list
   */
  it('TC-MERGE-QUEUE-006: displays error message for failed request', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    act(() => emitSnapshot([makeRequest({ status: 'failed', error: 'Cloud function crashed' })]));
    expect(screen.getByText('Cloud function crashed')).toBeTruthy();
  });
});

describe.sequential('MergeRequestsQueue — Spanish labels', () => {
  /**
   * TC-MERGE-QUEUE-007
   * Verifies: Spanish labels render when lang="es"
   */
  it('TC-MERGE-QUEUE-007: renders Spanish labels when lang is es', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="es" />);
    act(() => emitSnapshot([makeRequest({ status: 'pending' })]));
    expect(screen.getByText('Revisar')).toBeTruthy();
  });
});

describe.sequential('MergeRequestsQueue — completed request no action buttons', () => {
  /**
   * TC-MERGE-QUEUE-008
   * Verifies: completed requests show no action buttons (neither Review nor Retry)
   */
  it('TC-MERGE-QUEUE-008: shows no action buttons for completed request', () => {
    (globalThis as any).__mqCallbacks = { onSnapshot: undefined, unsubscribe: vi.fn() };
    render(<MergeRequestsQueue lang="en" />);
    act(() => emitSnapshot([makeRequest({ status: 'completed' })]));
    expect(screen.queryByText('Review')).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
  });
});
