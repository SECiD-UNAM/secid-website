import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module-under-test is imported.
// vi.mock is hoisted, so these execute first regardless of source position.
// ---------------------------------------------------------------------------

const mockIsUsingMockAPI = vi.fn(() => true);

vi.mock('@/lib/firebase', () => ({
  db: { _mockDb: true },
  isUsingMockAPI: (...args: unknown[]) => mockIsUsingMockAPI(...args),
}));

const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
}));

// ---------------------------------------------------------------------------
// Import the module under test — functions reference the mocks above at call
// time, so toggling mockIsUsingMockAPI controls which branch executes.
// ---------------------------------------------------------------------------

import { deleteSpotlight } from '@/lib/spotlights';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Spotlights Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUsingMockAPI.mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // deleteSpotlight
  // -------------------------------------------------------------------------

  describe('deleteSpotlight', () => {
    it('TC-sp-001: calls deleteDoc with the correct Firestore document reference', async () => {
      /** Verifies: AC-1 — deleteSpotlight calls deleteDoc with correct path */
      const fakeDocRef = { _path: 'spotlights/spotlight-1' };
      mockDoc.mockReturnValue(fakeDocRef);
      mockDeleteDoc.mockResolvedValue(undefined);

      await deleteSpotlight('spotlight-1');

      expect(mockDoc).toHaveBeenCalledWith({ _mockDb: true }, 'spotlights', 'spotlight-1');
      expect(mockDeleteDoc).toHaveBeenCalledWith(fakeDocRef);
    });

    it('TC-sp-002: resolves without a return value on successful deletion', async () => {
      /** Verifies: AC-1 — deleteSpotlight returns Promise<void> */
      mockDoc.mockReturnValue({ _path: 'spotlights/spotlight-2' });
      mockDeleteDoc.mockResolvedValue(undefined);

      const result = await deleteSpotlight('spotlight-2');

      expect(result).toBeUndefined();
    });

    it('TC-sp-003: propagates Firestore errors to the caller', async () => {
      /** Verifies: AC-1 — errors are not swallowed */
      mockDoc.mockReturnValue({ _path: 'spotlights/bad-id' });
      mockDeleteDoc.mockRejectedValue(new Error('Firestore permission denied'));

      await expect(deleteSpotlight('bad-id')).rejects.toThrow('Firestore permission denied');
    });
  });
});
