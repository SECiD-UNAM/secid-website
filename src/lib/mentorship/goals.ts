/**
 * Mentorship goal and resource management operations.
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
import type { MentorshipGoal, MentorshipResource } from '../../types';
import { COLLECTIONS, firestoreToDate, dateToFirestore } from './constants';

// --- Resource Management ---

export async function createMentorshipResource(
  resource: Omit<MentorshipResource, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MentorshipResource> {
  try {
    const resourceData = {
      ...resource,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.RESOURCES), resourceData);

    return {
      ...resource,
      id: docRef['id'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship resource:', error);
    throw new Error('Failed to create resource');
  }
}

export async function getMentorshipResources(filters?: {
  category?: string;
  difficulty?: string;
  sharedBy?: string;
  tags?: string[];
}): Promise<MentorshipResource[]> {
  try {
    let q = query(collection(db, COLLECTIONS.RESOURCES));

    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters?.difficulty) {
      q = query(q, where('difficulty', '==', filters.difficulty));
    }

    if (filters?.sharedBy) {
      q = query(q, where('sharedBy', '==', filters.sharedBy));
    }

    if (filters?.tags && filters.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', filters.tags));
    }

    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const resources: MentorshipResource[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      resources.push({
        ...data,
        id: doc['id'],
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorshipResource);
    });

    return resources;
  } catch (error) {
    console.error('Error getting mentorship resources:', error);
    throw new Error('Failed to load resources');
  }
}

// --- Goal Management ---

export async function createMentorshipGoal(
  goal: Omit<MentorshipGoal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MentorshipGoal> {
  try {
    const goalData = {
      ...goal,
      targetDate: goal.targetDate ? dateToFirestore(goal.targetDate) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      milestones: goal.milestones.map((milestone: { completedAt?: Date; [key: string]: any }) => ({
        ...milestone,
        completedAt: milestone.completedAt ? dateToFirestore(milestone.completedAt) : null
      }))
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.GOALS), goalData);

    return {
      ...goal,
      id: docRef['id'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship goal:', error);
    throw new Error('Failed to create goal');
  }
}

export async function updateMentorshipGoal(
  goalId: string,
  updates: Partial<MentorshipGoal>
): Promise<MentorshipGoal> {
  try {
    const docRef = doc(db, COLLECTIONS.GOALS, goalId);
    const updateData: Record<string, any> = { ...updates };

    if (updates.targetDate) {
      updateData.targetDate = dateToFirestore(updates.targetDate);
    }

    if (updates.milestones) {
      updateData.milestones = updates.milestones.map((milestone: { completedAt?: Date; [key: string]: any }) => ({
        ...milestone,
        completedAt: milestone.completedAt ? dateToFirestore(milestone.completedAt) : null
      }));
    }

    updateData['updatedAt'] = serverTimestamp();

    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
      const data = updatedDoc['data']();
      return {
        ...data,
        id: updatedDoc['id'],
        targetDate: data.targetDate ? firestoreToDate(data['targetDate']) : undefined,
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        milestones: data['milestones'].map((milestone: any) => ({
          ...milestone,
          completedAt: milestone.completedAt ? firestoreToDate(milestone.completedAt) : undefined
        }))
      } as unknown as MentorshipGoal;
    }

    throw new Error('Goal not found after update');
  } catch (error) {
    console.error('Error updating mentorship goal:', error);
    throw new Error('Failed to update goal');
  }
}

export async function getMentorshipGoals(matchId: string): Promise<MentorshipGoal[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.GOALS),
      where('matchId', '==', matchId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const goals: MentorshipGoal[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        ...data,
        id: doc['id'],
        targetDate: data['targetDate'] ? firestoreToDate(data['targetDate']) : undefined,
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        milestones: data['milestones'].map((milestone: any) => ({
          ...milestone,
          completedAt: milestone.completedAt ? firestoreToDate(milestone.completedAt) : undefined
        }))
      } as unknown as MentorshipGoal);
    });

    return goals;
  } catch (error) {
    console.error('Error getting mentorship goals:', error);
    throw new Error('Failed to load goals');
  }
}
