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

export interface NewsletterIssue {
  id: string;
  title: string;
  issueNumber: number;
  publishedAt: Date;
  content: string;
  excerpt: string;
  coverImage?: string;
  status: 'draft' | 'published';
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toIssue(doc: { id: string; data: () => Record<string, unknown> }): NewsletterIssue {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    publishedAt: (data.publishedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
  } as NewsletterIssue;
}

export async function getNewsletterArchive(): Promise<NewsletterIssue[]> {
  try {
    const q = query(
      collection(db, 'newsletter_archive'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toIssue);
  } catch (error) {
    console.error('Error fetching newsletter archive:', error);
    return [];
  }
}

export async function getAllNewsletters(): Promise<NewsletterIssue[]> {
  try {
    const q = query(
      collection(db, 'newsletter_archive'),
      orderBy('publishedAt', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(toIssue);
  } catch (error) {
    console.error('Error fetching all newsletters:', error);
    return [];
  }
}

export async function getNewsletter(
  id: string
): Promise<NewsletterIssue | null> {
  try {
    const docRef = doc(db, 'newsletter_archive', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return toIssue(snapshot);
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    return null;
  }
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

export async function createNewsletter(
  data: Omit<NewsletterIssue, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'newsletter_archive'), {
    ...clean(data as Record<string, unknown>),
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateNewsletter(
  id: string,
  data: Partial<NewsletterIssue>,
  userId: string
): Promise<void> {
  const docRef = doc(db, 'newsletter_archive', id);
  await updateDoc(docRef, {
    ...clean(data as Record<string, unknown>),
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNewsletter(id: string): Promise<void> {
  const docRef = doc(db, 'newsletter_archive', id);
  await deleteDoc(docRef);
}
