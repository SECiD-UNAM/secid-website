import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JournalClubSession {
  id: string;
  date: Date;
  topic: string;
  presenter: string;
  presenterUid?: string;
  description?: string;
  paperUrl?: string;
  slidesUrl?: string;
  recordingUrl?: string;
  status: 'draft' | 'published' | 'cancelled';
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSession(
  id: string,
  data: Record<string, unknown>
): JournalClubSession {
  return {
    id,
    ...data,
    date: (data.date as { toDate(): Date })?.toDate?.() || (data.date as Date),
    createdAt: (data.createdAt as { toDate(): Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate(): Date })?.toDate?.() || new Date(),
  } as JournalClubSession;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

/**
 * Returns published journal club sessions, ordered by date descending.
 */
export async function getJournalClubSessions(): Promise<JournalClubSession[]> {
  try {
    const q = query(
      collection(db, 'journal_club_sessions'),
      where('status', '==', 'published'),
      orderBy('date', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toSession(d.id, d.data()));
  } catch (error) {
    console.error('Error fetching journal club sessions:', error);
    return [];
  }
}

/**
 * Returns ALL journal club sessions (all statuses) for the management dashboard.
 * Ordered by date descending.
 */
export async function getAllJournalClubSessions(): Promise<
  JournalClubSession[]
> {
  try {
    const q = query(
      collection(db, 'journal_club_sessions'),
      orderBy('date', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => toSession(d.id, d.data()));
  } catch (error) {
    console.error('Error fetching all journal club sessions:', error);
    return [];
  }
}

/**
 * Returns a single journal club session by ID, or null if not found.
 */
export async function getJournalClubSession(
  id: string
): Promise<JournalClubSession | null> {
  try {
    const docRef = doc(db, 'journal_club_sessions', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return null;
    }
    return toSession(snapshot.id, snapshot.data());
  } catch (error) {
    console.error('Error fetching journal club session:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Creates a new journal club session.
 * Sets createdBy, createdAt, and updatedAt automatically.
 * Returns the new document ID.
 */
export async function createJournalClubSession(
  data: Omit<
    JournalClubSession,
    'id' | 'createdBy' | 'createdAt' | 'updatedAt'
  >,
  userId: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'journal_club_sessions'), {
    ...data,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing journal club session.
 * Sets updatedAt automatically.
 */
export async function updateJournalClubSession(
  id: string,
  data: Partial<Omit<JournalClubSession, 'id' | 'createdBy' | 'createdAt'>>,
  userId: string
): Promise<void> {
  await updateDoc(doc(db, 'journal_club_sessions', id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Deletes a journal club session document.
 */
export async function deleteJournalClubSession(id: string): Promise<void> {
  await deleteDoc(doc(db, 'journal_club_sessions', id));
}
