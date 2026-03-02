/**
 * Real-time Firestore subscriptions for mentorship data.
 */

import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import type { MentorshipRequest, MentorshipSession } from '../../types';
import { COLLECTIONS, firestoreToDate, dateToFirestore } from './constants';

export function subscribeMentorshipRequests(
  userId: string,
  callback: (requests: MentorshipRequest[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.REQUESTS),
    where('mentorId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const requests: MentorshipRequest[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        ...data,
        id: doc['id'],
        createdAt: firestoreToDate(data['createdAt']),
        respondedAt: data['respondedAt'] ? firestoreToDate(data['respondedAt']) : undefined
      } as unknown as MentorshipRequest);
    });

    callback(requests);
  }, (error) => {
    console.error('Error in requests subscription:', error);
  });
}

export function subscribeUpcomingSessions(
  userId: string,
  callback: (sessions: MentorshipSession[]) => void
): () => void {
  const now = new Date();

  const q = query(
    collection(db, COLLECTIONS.SESSIONS),
    where('mentorId', '==', userId),
    where('scheduledAt', '>', dateToFirestore(now)),
    where('status', '==', 'scheduled'),
    orderBy('scheduledAt', 'asc'),
    limit(5)
  );

  return onSnapshot(q, (querySnapshot) => {
    const sessions: MentorshipSession[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        id: doc['id'],
        scheduledAt: firestoreToDate(data['scheduledAt']),
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorshipSession);
    });

    callback(sessions);
  }, (error) => {
    console.error('Error in sessions subscription:', error);
  });
}
