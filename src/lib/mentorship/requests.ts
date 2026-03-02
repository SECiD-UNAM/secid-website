/**
 * Mentorship request operations.
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
  serverTimestamp
} from 'firebase/firestore';
import type { MentorshipRequest } from '../../types';
import { COLLECTIONS, firestoreToDate, dateToFirestore } from './constants';
import { createMentorshipMatch } from './matching';

export async function getMentorshipRequests(filters: {
  mentorId?: string;
  menteeId?: string;
  requestId?: string;
  status?: string;
}): Promise<MentorshipRequest[]> {
  try {
    let q = query(collection(db, COLLECTIONS.REQUESTS));

    if (filters.requestId) {
      const docRef = doc(db, COLLECTIONS.REQUESTS, filters.requestId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return [{
          ...data,
          id: docSnap['id'],
          createdAt: firestoreToDate(data['createdAt']),
          respondedAt: data['respondedAt'] ? firestoreToDate(data['respondedAt']) : undefined
        } as unknown as MentorshipRequest];
      }

      return [];
    }

    if (filters.mentorId) {
      q = query(q, where('mentorId', '==', filters.mentorId));
    }

    if (filters.menteeId) {
      q = query(q, where('menteeId', '==', filters.menteeId));
    }

    if (filters['status']) {
      q = query(q, where('status', '==', filters['status']));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
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

    return requests;
  } catch (error) {
    console.error('Error getting mentorship requests:', error);
    throw new Error('Failed to load requests');
  }
}

export async function createMentorshipRequest(
  request: Omit<MentorshipRequest, 'id' | 'createdAt' | 'respondedAt'>
): Promise<MentorshipRequest> {
  try {
    const requestData = {
      ...request,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.REQUESTS), requestData);

    return {
      ...request,
      id: docRef['id'],
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship request:', error);
    throw new Error('Failed to create request');
  }
}

export async function updateMentorshipRequest(
  requestId: string,
  updates: Partial<MentorshipRequest>
): Promise<MentorshipRequest> {
  try {
    const docRef = doc(db, COLLECTIONS.REQUESTS, requestId);
    const updateData: Record<string, any> = { ...updates };

    if (updates.respondedAt) {
      updateData.respondedAt = dateToFirestore(updates.respondedAt);
    }

    await updateDoc(docRef, updateData);

    // If request is accepted, create a match
    if (updates['status'] === 'accepted') {
      const requestDoc = await getDoc(docRef);
      if (requestDoc.exists()) {
        const requestData = requestDoc.data() as MentorshipRequest;

        await createMentorshipMatch({
          mentorId: requestData.mentorId,
          menteeId: requestData.menteeId,
          status: 'active',
          matchScore: 0.8,
          matchReason: ['Accepted mentorship request'],
          requestMessage: requestData['message'],
          goals: requestData.goals,
          meetingFrequency: requestData.meetingFrequency || '',
          communicationPreference: requestData.communicationPreference || '',
          sessionsCompleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          startDate: new Date()
        });
      }
    }

    // Return updated request
    const requests = await getMentorshipRequests({ requestId });
    if (!requests[0]) {
      throw new Error('Request not found after update');
    }
    return requests[0];
  } catch (error) {
    console.error('Error updating mentorship request:', error);
    throw new Error('Failed to update request');
  }
}
