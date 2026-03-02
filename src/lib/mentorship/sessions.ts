/**
 * Mentorship session CRUD operations.
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import type { MentorshipSession } from '../../types';
import { COLLECTIONS, firestoreToDate, dateToFirestore } from './constants';

export async function getMentorshipSessions(filters: {
  matchId?: string;
  userId?: string;
  sessionId?: string;
  status?: string;
}): Promise<MentorshipSession[]> {
  try {
    let q = query(collection(db, COLLECTIONS.SESSIONS));

    if (filters.sessionId) {
      const docRef = doc(db, COLLECTIONS.SESSIONS, filters.sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return [{
          ...data,
          id: docSnap['id'],
          scheduledAt: firestoreToDate(data['scheduledAt']),
          createdAt: firestoreToDate(data['createdAt']),
          updatedAt: firestoreToDate(data['updatedAt']),
          homework: data['homework']?.map((hw: any) => ({
            ...hw,
            dueDate: hw.dueDate ? firestoreToDate(hw.dueDate) : undefined
          }))
        } as unknown as MentorshipSession];
      }

      return [];
    }

    if (filters.matchId) {
      q = query(q, where('matchId', '==', filters.matchId));
    }

    if (filters['userId']) {
      q = query(q, where('mentorId', '==', filters['userId']));
      // TODO: Also query for menteeId - need compound query
    }

    if (filters['status']) {
      q = query(q, where('status', '==', filters['status']));
    }

    q = query(q, orderBy('scheduledAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const sessions: MentorshipSession[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        id: doc['id'],
        scheduledAt: firestoreToDate(data['scheduledAt']),
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        homework: data['homework']?.map((hw: any) => ({
          ...hw,
          dueDate: hw.dueDate ? firestoreToDate(hw.dueDate) : undefined
        }))
      } as unknown as MentorshipSession);
    });

    return sessions;
  } catch (error) {
    console.error('Error getting mentorship sessions:', error);
    throw new Error('Failed to load sessions');
  }
}

export async function getUpcomingSessions(userId: string): Promise<MentorshipSession[]> {
  try {
    const now = new Date();

    const mentorQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('mentorId', '==', userId),
      where('scheduledAt', '>', dateToFirestore(now)),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc'),
      limit(10)
    );

    const menteeQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('menteeId', '==', userId),
      where('scheduledAt', '>', dateToFirestore(now)),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc'),
      limit(10)
    );

    const [mentorSessions, menteeSessions] = await Promise.all([
      getDocs(mentorQuery),
      getDocs(menteeQuery)
    ]);

    const sessions: MentorshipSession[] = [];

    [...mentorSessions.docs, ...menteeSessions.docs].forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        id: doc['id'],
        scheduledAt: firestoreToDate(data['scheduledAt']),
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        homework: data['homework']?.map((hw: any) => ({
          ...hw,
          dueDate: hw.dueDate ? firestoreToDate(hw.dueDate) : undefined
        }))
      } as unknown as MentorshipSession);
    });

    // Remove duplicates and sort by date
    const uniqueSessions = sessions.filter((session, index, self) =>
      index === self.findIndex(s => s['id'] === session['id'])
    );

    return uniqueSessions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  } catch (error) {
    console.error('Error getting upcoming sessions:', error);
    throw new Error('Failed to load upcoming sessions');
  }
}

export async function createMentorshipSession(
  session: Omit<MentorshipSession, 'id'>
): Promise<MentorshipSession> {
  try {
    const matchDoc = await getDoc(doc(db, COLLECTIONS.MATCHES, session.matchId));
    if (!matchDoc.exists()) {
      throw new Error('Match not found');
    }

    const matchData = matchDoc['data']();

    const sessionData = {
      ...session,
      mentorId: matchData.mentorId,
      menteeId: matchData.menteeId,
      scheduledAt: dateToFirestore(session.scheduledAt),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      homework: session?.homework?.map((hw: { dueDate?: Date; [key: string]: any }) => ({
        ...hw,
        dueDate: hw.dueDate ? dateToFirestore(hw.dueDate) : null
      }))
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.SESSIONS), sessionData);

    return {
      ...session,
      id: docRef['id'],
      mentorId: matchData.mentorId,
      menteeId: matchData.menteeId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship session:', error);
    throw new Error('Failed to create session');
  }
}

export async function updateMentorshipSession(
  sessionId: string,
  updates: Partial<MentorshipSession>
): Promise<MentorshipSession> {
  try {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const updateData: Record<string, any> = { ...updates };

    if (updates.scheduledAt) {
      updateData.scheduledAt = dateToFirestore(updates.scheduledAt);
    }

    if (updates.homework) {
      updateData.homework = updates.homework.map((hw: { dueDate?: Date; [key: string]: any }) => ({
        ...hw,
        dueDate: hw.dueDate ? dateToFirestore(hw.dueDate) : null
      }));
    }

    updateData['updatedAt'] = serverTimestamp();

    await updateDoc(docRef, updateData);

    const sessions = await getMentorshipSessions({ sessionId });
    if (!sessions[0]) {
      throw new Error('Session not found after update');
    }
    return sessions[0];
  } catch (error) {
    console.error('Error updating mentorship session:', error);
    throw new Error('Failed to update session');
  }
}
