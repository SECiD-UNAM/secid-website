/**
 * Unit tests for client-side merge mutations library.
 *
 * TC-merge-001 through TC-merge-006: core mutation operations for the
 * profile merge flow — numeroCuenta conflict detection and dismissal.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockGetDocs = vi.fn();
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');

vi.mock('firebase/firestore', () => ({
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/lib/firebase', () => ({
  db: {},
  isUsingMockAPI: () => false,
}));

import {
  checkNumeroCuentaMatch,
  dismissMergeMatch,
} from '@/lib/merge/mutations';

describe('checkNumeroCuentaMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-merge-001: should return null when no match exists', async () => {
    /** Verifies: AC-merge-check-no-match */
    mockDoc.mockReturnValue('docRef');
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const result = await checkNumeroCuentaMatch('12345', 'currentUid');

    expect(result).toBeNull();
  });

  it('TC-merge-002: should return match data when different UID owns the numeroCuenta', async () => {
    /** Verifies: AC-merge-check-conflict-detected */
    mockDoc.mockReturnValue('docRef');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'otherUid', displayName: 'Other User' }),
    });

    const result = await checkNumeroCuentaMatch('12345', 'currentUid');

    expect(result).toEqual({ uid: 'otherUid', displayName: 'Other User' });
  });

  it('TC-merge-003: should return null when same UID owns the numeroCuenta', async () => {
    /** Verifies: AC-merge-check-same-user */
    mockDoc.mockReturnValue('docRef');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ uid: 'currentUid', displayName: 'Same User' }),
    });

    const result = await checkNumeroCuentaMatch('12345', 'currentUid');

    expect(result).toBeNull();
  });
});

describe('dismissMergeMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-merge-004: should update potentialMergeMatch.dismissed to true', async () => {
    /** Verifies: AC-merge-dismiss */
    mockDoc.mockReturnValue('docRef');
    mockUpdateDoc.mockResolvedValue(undefined);

    await dismissMergeMatch('uid123');

    expect(mockUpdateDoc).toHaveBeenCalledWith('docRef', {
      'potentialMergeMatch.dismissed': true,
      updatedAt: 'SERVER_TS',
    });
  });
});
