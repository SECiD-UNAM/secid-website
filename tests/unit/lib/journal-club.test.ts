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

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: 'serverTimestamp' }));

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

// ---------------------------------------------------------------------------
// Import the module under test — functions reference the mocks above at call
// time, so toggling mockIsUsingMockAPI controls which branch executes.
// ---------------------------------------------------------------------------

import {
  getJournalClubSessions,
  getAllJournalClubSessions,
  getJournalClubSession,
  createJournalClubSession,
  updateJournalClubSession,
  deleteJournalClubSession,
  type JournalClubSession,
} from '@/lib/journal-club';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Journal Club Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsUsingMockAPI.mockReturnValue(true);
  });

  // -------------------------------------------------------------------------
  // getJournalClubSessions — published only, mock fallback
  // -------------------------------------------------------------------------

  describe('getJournalClubSessions', () => {
    it('TC-jc-001: returns only published sessions in mock API mode', async () => {
      /** Verifies: AC-1 — published filter + mock fallback */
      const sessions = await getJournalClubSessions();

      expect(sessions.length).toBeGreaterThan(0);
      sessions.forEach((s) => {
        expect(s.status).toBe('published');
      });
    });

    it('TC-jc-002: queries Firestore for published sessions when not using mock API', async () => {
      /** Verifies: AC-1 — Firestore query path */
      mockIsUsingMockAPI.mockReturnValue(false);

      const mockSnapshot = {
        docs: [
          {
            id: 'fs-1',
            data: () => ({
              topic: 'Firestore Session',
              presenter: 'Test',
              status: 'published',
              date: { toDate: () => new Date('2026-03-11') },
              createdAt: { toDate: () => new Date('2026-03-01') },
              updatedAt: { toDate: () => new Date('2026-03-01') },
            }),
          },
        ],
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const sessions = await getJournalClubSessions();

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
      expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].topic).toBe('Firestore Session');
    });

    it('TC-jc-003: falls back to mock data on Firestore error', async () => {
      /** Verifies: AC-1 — error fallback */
      mockIsUsingMockAPI.mockReturnValue(false);
      mockGetDocs.mockRejectedValue(new Error('Firestore unavailable'));

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const sessions = await getJournalClubSessions();

      expect(sessions.length).toBeGreaterThan(0);
      sessions.forEach((s) => expect(s.status).toBe('published'));
      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // getAllJournalClubSessions — all statuses, for dashboard
  // -------------------------------------------------------------------------

  describe('getAllJournalClubSessions', () => {
    it('TC-jc-004: returns all sessions including non-published in mock API mode', async () => {
      /** Verifies: AC-2 — all statuses returned */
      const sessions = await getAllJournalClubSessions();

      expect(sessions.length).toBeGreaterThan(0);
      const statuses = new Set(sessions.map((s) => s.status));
      // Mock data includes 'draft' and 'published'
      expect(statuses.size).toBeGreaterThanOrEqual(2);
    });

    it('TC-jc-005: queries Firestore without status filter when not using mock API', async () => {
      /** Verifies: AC-2 — Firestore all-statuses query */
      mockIsUsingMockAPI.mockReturnValue(false);

      const mockSnapshot = {
        docs: [
          {
            id: 'fs-1',
            data: () => ({
              topic: 'Draft Session',
              presenter: 'Test',
              status: 'draft',
              date: { toDate: () => new Date('2026-03-11') },
              createdAt: { toDate: () => new Date('2026-03-01') },
              updatedAt: { toDate: () => new Date('2026-03-01') },
            }),
          },
          {
            id: 'fs-2',
            data: () => ({
              topic: 'Published Session',
              presenter: 'Test',
              status: 'published',
              date: { toDate: () => new Date('2026-03-10') },
              createdAt: { toDate: () => new Date('2026-03-01') },
              updatedAt: { toDate: () => new Date('2026-03-01') },
            }),
          },
        ],
      };
      mockGetDocs.mockResolvedValue(mockSnapshot);

      const sessions = await getAllJournalClubSessions();

      expect(sessions).toHaveLength(2);
      expect(mockWhere).not.toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
    });
  });

  // -------------------------------------------------------------------------
  // getJournalClubSession — single session by ID
  // -------------------------------------------------------------------------

  describe('getJournalClubSession', () => {
    it('TC-jc-006: returns a session by ID in mock API mode', async () => {
      /** Verifies: AC-3 — single session retrieval */
      const session = await getJournalClubSession('jc-1');

      expect(session).not.toBeNull();
      expect(session!.id).toBe('jc-1');
    });

    it('TC-jc-007: returns null for non-existent ID in mock API mode', async () => {
      /** Verifies: AC-3 — null for missing ID */
      const session = await getJournalClubSession('non-existent');

      expect(session).toBeNull();
    });

    it('TC-jc-008: fetches from Firestore when not using mock API', async () => {
      /** Verifies: AC-3 — Firestore fetch path */
      mockIsUsingMockAPI.mockReturnValue(false);

      const mockSnapshot = {
        exists: () => true,
        id: 'fs-1',
        data: () => ({
          topic: 'Firestore Session',
          presenter: 'Test',
          status: 'published',
          date: { toDate: () => new Date('2026-03-11') },
          createdAt: { toDate: () => new Date('2026-03-01') },
          updatedAt: { toDate: () => new Date('2026-03-01') },
        }),
      };
      mockGetDoc.mockResolvedValue(mockSnapshot);

      const session = await getJournalClubSession('fs-1');

      expect(session).not.toBeNull();
      expect(session!.topic).toBe('Firestore Session');
    });

    it('TC-jc-009: returns null when Firestore doc does not exist and no mock match', async () => {
      /** Verifies: AC-3 — null on Firestore miss */
      mockIsUsingMockAPI.mockReturnValue(false);

      const mockSnapshot = {
        exists: () => false,
      };
      mockGetDoc.mockResolvedValue(mockSnapshot);

      const session = await getJournalClubSession('non-existent');

      expect(session).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // createJournalClubSession
  // -------------------------------------------------------------------------

  describe('createJournalClubSession', () => {
    it('TC-jc-010: creates a session with required fields and timestamps', async () => {
      /** Verifies: AC-4 — create with createdBy, createdAt, updatedAt */
      mockAddDoc.mockResolvedValue({ id: 'new-doc-id' });

      const input = {
        date: new Date('2026-04-01'),
        topic: 'New Session',
        presenter: 'Author',
        status: 'draft' as const,
      };

      const id = await createJournalClubSession(input, 'user-123');

      expect(id).toBe('new-doc-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);

      const [, docData] = mockAddDoc.mock.calls[0];
      expect(docData.createdBy).toBe('user-123');
      expect(docData.createdAt).toEqual({ _type: 'serverTimestamp' });
      expect(docData.updatedAt).toEqual({ _type: 'serverTimestamp' });
      expect(docData.topic).toBe('New Session');
    });
  });

  // -------------------------------------------------------------------------
  // updateJournalClubSession
  // -------------------------------------------------------------------------

  describe('updateJournalClubSession', () => {
    it('TC-jc-011: updates a session and sets updatedAt timestamp', async () => {
      /** Verifies: AC-5 — update with updatedAt */
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateJournalClubSession(
        'jc-1',
        { topic: 'Updated Topic' },
        'user-456'
      );

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);

      const [, updates] = mockUpdateDoc.mock.calls[0];
      expect(updates.topic).toBe('Updated Topic');
      expect(updates.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });
  });

  // -------------------------------------------------------------------------
  // deleteJournalClubSession
  // -------------------------------------------------------------------------

  describe('deleteJournalClubSession', () => {
    it('TC-jc-012: deletes a session document', async () => {
      /** Verifies: AC-6 — delete calls deleteDoc */
      mockDeleteDoc.mockResolvedValue(undefined);

      await deleteJournalClubSession('jc-1');

      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Mock data quality
  // -------------------------------------------------------------------------

  describe('Mock data', () => {
    it('TC-jc-013: mock sessions have all required fields', async () => {
      /** Verifies: AC-1 — mock data structure validity */
      const sessions = await getJournalClubSessions();

      sessions.forEach((s) => {
        expect(s.id).toBeTruthy();
        expect(s.date).toBeInstanceOf(Date);
        expect(s.topic).toBeTruthy();
        expect(s.presenter).toBeTruthy();
        expect(['draft', 'published', 'cancelled']).toContain(s.status);
        expect(s.createdBy).toBeTruthy();
        expect(s.createdAt).toBeInstanceOf(Date);
        expect(s.updatedAt).toBeInstanceOf(Date);
      });
    });
  });
});
