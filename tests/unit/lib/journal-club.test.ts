import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module-under-test is imported.
// vi.mock is hoisted, so these execute first regardless of source position.
//
// NOTE: src/lib/journal-club.ts is a pure Firestore service. It has no
// "mock API mode" and no built-in mock data — on any read error it returns
// [] (or null for the single-doc getter). These tests assert that real
// contract: query shape, doc mapping, and the error fallbacks.
// ---------------------------------------------------------------------------

vi.mock('@/lib/firebase', () => ({
  db: { _mockDb: true },
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

import {
  getJournalClubSessions,
  getAllJournalClubSessions,
  getJournalClubSession,
  createJournalClubSession,
  updateJournalClubSession,
  deleteJournalClubSession,
} from '@/lib/journal-club';

const docOf = (
  id: string,
  status: 'draft' | 'published' | 'cancelled',
  topic: string
) => ({
  id,
  data: () => ({
    topic,
    presenter: 'Test Presenter',
    status,
    date: { toDate: () => new Date('2026-03-11') },
    createdAt: { toDate: () => new Date('2026-03-01') },
    updatedAt: { toDate: () => new Date('2026-03-02') },
    createdBy: 'user-1',
  }),
});

describe('Journal Club Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // -------------------------------------------------------------------------
  // getJournalClubSessions — published only
  // -------------------------------------------------------------------------

  describe('getJournalClubSessions', () => {
    it('TC-jc-001: queries published sessions, ordered by date desc, mapped', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [docOf('fs-1', 'published', 'Firestore Session')],
      });

      const sessions = await getJournalClubSessions();

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
      expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(50);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('fs-1');
      expect(sessions[0].topic).toBe('Firestore Session');
      expect(sessions[0].date).toBeInstanceOf(Date);
    });

    it('TC-jc-002: returns [] when there are no published sessions', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      expect(await getJournalClubSessions()).toEqual([]);
    });

    it('TC-jc-003: returns [] (no throw) on Firestore error', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore unavailable'));
      const sessions = await getJournalClubSessions();
      expect(sessions).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getAllJournalClubSessions — all statuses, for dashboard
  // -------------------------------------------------------------------------

  describe('getAllJournalClubSessions', () => {
    it('TC-jc-004: returns all statuses with no status filter, limit 100', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          docOf('d-1', 'draft', 'Draft Session'),
          docOf('p-1', 'published', 'Published Session'),
        ],
      });

      const sessions = await getAllJournalClubSessions();

      expect(mockWhere).not.toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalledWith('date', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(100);
      expect(sessions).toHaveLength(2);
      expect(new Set(sessions.map((s) => s.status))).toEqual(
        new Set(['draft', 'published'])
      );
    });

    it('TC-jc-005: returns [] (no throw) on Firestore error', async () => {
      mockGetDocs.mockRejectedValue(new Error('boom'));
      expect(await getAllJournalClubSessions()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getJournalClubSession — single session by ID
  // -------------------------------------------------------------------------

  describe('getJournalClubSession', () => {
    it('TC-jc-006: returns the mapped session when the doc exists', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'fs-1',
        data: docOf('fs-1', 'published', 'Firestore Session').data,
      });

      const session = await getJournalClubSession('fs-1');

      expect(session).not.toBeNull();
      expect(session!.id).toBe('fs-1');
      expect(session!.topic).toBe('Firestore Session');
    });

    it('TC-jc-007: returns null when the doc does not exist', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      expect(await getJournalClubSession('non-existent')).toBeNull();
    });

    it('TC-jc-008: returns null (no throw) on Firestore error', async () => {
      mockGetDoc.mockRejectedValue(new Error('boom'));
      expect(await getJournalClubSession('fs-1')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // createJournalClubSession
  // -------------------------------------------------------------------------

  describe('createJournalClubSession', () => {
    it('TC-jc-009: creates with createdBy + server timestamps, returns id', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-doc-id' });

      const id = await createJournalClubSession(
        {
          date: new Date('2026-04-01'),
          topic: 'New Session',
          presenter: 'Author',
          status: 'draft',
        },
        'user-123'
      );

      expect(id).toBe('new-doc-id');
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      const [, docData] = mockAddDoc.mock.calls[0];
      expect(docData.createdBy).toBe('user-123');
      expect(docData.createdAt).toEqual({ _type: 'serverTimestamp' });
      expect(docData.updatedAt).toEqual({ _type: 'serverTimestamp' });
      expect(docData.topic).toBe('New Session');
    });

    it('TC-jc-010: strips undefined fields before write', async () => {
      mockAddDoc.mockResolvedValue({ id: 'x' });

      await createJournalClubSession(
        {
          date: new Date('2026-04-01'),
          topic: 'T',
          presenter: 'P',
          status: 'draft',
          paperUrl: undefined,
        } as never,
        'user-1'
      );

      const [, docData] = mockAddDoc.mock.calls[0];
      expect('paperUrl' in docData).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // updateJournalClubSession
  // -------------------------------------------------------------------------

  describe('updateJournalClubSession', () => {
    it('TC-jc-011: updates fields and sets updatedBy + updatedAt', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateJournalClubSession(
        'jc-1',
        { topic: 'Updated Topic' },
        'user-456'
      );

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [, updates] = mockUpdateDoc.mock.calls[0];
      expect(updates.topic).toBe('Updated Topic');
      expect(updates.updatedBy).toBe('user-456');
      expect(updates.updatedAt).toEqual({ _type: 'serverTimestamp' });
    });
  });

  // -------------------------------------------------------------------------
  // deleteJournalClubSession
  // -------------------------------------------------------------------------

  describe('deleteJournalClubSession', () => {
    it('TC-jc-012: calls deleteDoc once', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);
      await deleteJournalClubSession('jc-1');
      expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    });
  });
});
