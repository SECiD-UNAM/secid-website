/**
 * Mentor and Mentee profile CRUD operations.
 */

import { db, storage } from '../firebase';
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
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';
import type { MentorProfile, MenteeProfile } from '../../types';
import { COLLECTIONS, firestoreToDate, dateToFirestore } from './constants';

// --- Mentor Profile Operations ---

export async function getMentorProfile(userId: string): Promise<MentorProfile | null> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTORS, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting mentor profile:', error);
    throw new Error('Failed to load mentor profile');
  }
}

export async function getMentorProfiles(filters?: {
  isActive?: boolean;
  expertiseAreas?: string[];
  limit?: number;
}): Promise<MentorProfile[]> {
  try {
    let q = query(collection(db, COLLECTIONS.MENTORS));

    if (filters?.isActive !== undefined) {
      q = query(q, where('isActive', '==', filters.isActive));
    }

    if (filters?.expertiseAreas && filters.expertiseAreas.length > 0) {
      q = query(q, where('expertiseAreas', 'array-contains-any', filters.expertiseAreas));
    }

    q = query(q, orderBy('rating', 'desc'));

    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }

    const querySnapshot = await getDocs(q);
    const mentors: MentorProfile[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      mentors.push({
        ...data,
        id: doc['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorProfile);
    });

    return mentors;
  } catch (error) {
    console.error('Error getting mentor profiles:', error);
    throw new Error('Failed to load mentor profiles');
  }
}

export async function createMentorProfile(profile: MentorProfile): Promise<MentorProfile> {
  try {
    const profileData = {
      ...profile,
      joinedAt: dateToFirestore(profile.joinedAt),
      updatedAt: dateToFirestore(profile['updatedAt'])
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.MENTORS), profileData);

    return {
      ...profile,
      id: docRef['id']
    };
  } catch (error) {
    console.error('Error creating mentor profile:', error);
    throw new Error('Failed to create mentor profile');
  }
}

export async function updateMentorProfile(
  userId: string,
  updates: Partial<MentorProfile>
): Promise<MentorProfile> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTORS, userId);
    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (updates.joinedAt) {
      updateData.joinedAt = dateToFirestore(updates.joinedAt);
    }

    await updateDoc(docRef, updateData);

    const updatedProfile = await getMentorProfile(userId);
    if (!updatedProfile) {
      throw new Error('Profile not found after update');
    }

    return updatedProfile;
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    throw new Error('Failed to update mentor profile');
  }
}

// --- Mentee Profile Operations ---

export async function getMenteeProfile(userId: string): Promise<MenteeProfile | null> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTEES, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MenteeProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting mentee profile:', error);
    throw new Error('Failed to load mentee profile');
  }
}

export async function createMenteeProfile(profile: MenteeProfile): Promise<MenteeProfile> {
  try {
    const profileData = {
      ...profile,
      joinedAt: dateToFirestore(profile.joinedAt),
      updatedAt: dateToFirestore(profile['updatedAt'])
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.MENTEES), profileData);

    return {
      ...profile,
      id: docRef['id']
    };
  } catch (error) {
    console.error('Error creating mentee profile:', error);
    throw new Error('Failed to create mentee profile');
  }
}

export async function updateMenteeProfile(
  userId: string,
  updates: Partial<MenteeProfile>
): Promise<MenteeProfile> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTEES, userId);
    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (updates.joinedAt) {
      updateData.joinedAt = dateToFirestore(updates.joinedAt);
    }

    await updateDoc(docRef, updateData);

    const updatedProfile = await getMenteeProfile(userId);
    if (!updatedProfile) {
      throw new Error('Profile not found after update');
    }

    return updatedProfile;
  } catch (error) {
    console.error('Error updating mentee profile:', error);
    throw new Error('Failed to update mentee profile');
  }
}

// --- File Upload ---

export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  try {
    const imageRef = storageRef(storage, `mentorship/profiles/${userId}/${file['name']}`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot['ref']);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload image');
  }
}
