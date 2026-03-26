import { db, isUsingMockAPI } from './firebase';
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

// Mock data for development
const mockNewsletters: NewsletterIssue[] = [
  {
    id: 'newsletter-1',
    title: 'SECiD Monthly - Enero 2025',
    issueNumber: 12,
    publishedAt: new Date('2025-01-15'),
    content:
      '<h2>Bienvenidos al Newsletter de Enero</h2><p>Este mes destacamos los logros de nuestra comunidad...</p>',
    excerpt: 'Resumen de los logros de nuestra comunidad en el inicio de 2025.',
    coverImage: '/images/newsletter-jan.jpg',
    status: 'published',
    createdBy: 'system',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  },
  {
    id: 'newsletter-2',
    title: 'SECiD Monthly - Diciembre 2024',
    issueNumber: 11,
    publishedAt: new Date('2024-12-15'),
    content:
      '<h2>Cierre de Año 2024</h2><p>Un año increíble para SECiD con más de 500 nuevos miembros...</p>',
    excerpt: 'Un año increíble para SECiD con más de 500 nuevos miembros.',
    coverImage: '/images/newsletter-dec.jpg',
    status: 'published',
    createdBy: 'system',
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'newsletter-3',
    title: 'SECiD Monthly - Noviembre 2024',
    issueNumber: 10,
    publishedAt: new Date('2024-11-15'),
    content:
      '<h2>Especial Hackathon</h2><p>Resultados del primer hackathon de ciencia de datos...</p>',
    excerpt: 'Resultados del primer hackathon de ciencia de datos de SECiD.',
    coverImage: '/images/newsletter-nov.jpg',
    status: 'published',
    createdBy: 'system',
    createdAt: new Date('2024-11-15'),
    updatedAt: new Date('2024-11-15'),
  },
  {
    id: 'newsletter-4',
    title: 'SECiD Monthly - Octubre 2024',
    issueNumber: 9,
    publishedAt: new Date('2024-10-15'),
    content:
      '<h2>Conferencia Anual</h2><p>Todo sobre nuestra conferencia anual de ciencia de datos...</p>',
    excerpt: 'Todo sobre nuestra conferencia anual de ciencia de datos.',
    coverImage: '/images/newsletter-oct.jpg',
    status: 'published',
    createdBy: 'system',
    createdAt: new Date('2024-10-15'),
    updatedAt: new Date('2024-10-15'),
  },
  {
    id: 'newsletter-5',
    title: 'SECiD Monthly - Septiembre 2024',
    issueNumber: 8,
    publishedAt: new Date('2024-09-15'),
    content:
      '<h2>Nuevas Comisiones</h2><p>Lanzamos tres nuevas comisiones técnicas...</p>',
    excerpt: 'Lanzamos tres nuevas comisiones técnicas para nuestros miembros.',
    coverImage: '/images/newsletter-sep.jpg',
    status: 'published',
    createdBy: 'system',
    createdAt: new Date('2024-09-15'),
    updatedAt: new Date('2024-09-15'),
  },
];

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
  if (isUsingMockAPI()) {
    return mockNewsletters.filter((n) => n.status === 'published');
  }

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
    return mockNewsletters.filter((n) => n.status === 'published');
  }
}

export async function getAllNewsletters(): Promise<NewsletterIssue[]> {
  if (isUsingMockAPI()) {
    return mockNewsletters;
  }

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
    return mockNewsletters;
  }
}

export async function getNewsletter(
  id: string
): Promise<NewsletterIssue | null> {
  if (isUsingMockAPI()) {
    return mockNewsletters.find((n) => n.id === id) || null;
  }

  try {
    const docRef = doc(db, 'newsletter_archive', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists())
      return mockNewsletters.find((n) => n.id === id) || null;
    return toIssue(snapshot);
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    return mockNewsletters.find((n) => n.id === id) || null;
  }
}

export async function createNewsletter(
  data: Omit<NewsletterIssue, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'newsletter_archive'), {
    ...data,
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
    ...data,
    updatedBy: userId,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteNewsletter(id: string): Promise<void> {
  const docRef = doc(db, 'newsletter_archive', id);
  await deleteDoc(docRef);
}
