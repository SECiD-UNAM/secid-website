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
  limit,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { AlumniSpotlight } from '@/types/spotlight';

export async function getAllSpotlights(): Promise<AlumniSpotlight[]> {
  try {
    const q = query(
      collection(db, 'spotlights'),
      orderBy('publishedAt', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      publishedAt: d.data().publishedAt?.toDate() || new Date(),
    })) as AlumniSpotlight[];
  } catch (error) {
    console.error('Error fetching all spotlights:', error);
    return [];
  }
}

export async function getSpotlights(): Promise<AlumniSpotlight[]> {
  try {
    const q = query(
      collection(db, 'spotlights'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      publishedAt: d.data().publishedAt?.toDate() || new Date(),
    })) as AlumniSpotlight[];
  } catch (error) {
    console.error('Error fetching spotlights:', error);
    return [];
  }
}

export async function getSpotlight(
  id: string
): Promise<AlumniSpotlight | null> {
  try {
    const docRef = doc(db, 'spotlights', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return null;
    }
    return {
      id: snapshot.id,
      ...snapshot.data(),
      publishedAt: snapshot.data().publishedAt?.toDate() || new Date(),
    } as AlumniSpotlight;
  } catch (error) {
    console.error('Error fetching spotlight:', error);
    return null;
  }
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export async function createSpotlight(
  spotlight: Omit<AlumniSpotlight, 'id' | 'publishedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'spotlights'), {
    ...clean(spotlight as Record<string, unknown>),
    publishedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSpotlight(
  id: string,
  updates: Partial<AlumniSpotlight>,
  userId?: string
): Promise<void> {
  await updateDoc(doc(db, 'spotlights', id), {
    ...clean(updates as Record<string, unknown>),
    ...(userId ? { updatedBy: userId } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSpotlight(id: string): Promise<void> {
  const docRef = doc(db, 'spotlights', id);
  await deleteDoc(docRef);
}
