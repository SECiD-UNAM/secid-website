import { db, isUsingMockAPI } from './firebase';
import { collection, doc, getDocs, getDoc, query, orderBy, limit, where } from 'firebase/firestore';

export interface NewsletterIssue {
  id: string;
  title: string;
  issueNumber: number;
  publishedAt: Date;
  content: string;
  excerpt: string;
  coverImage?: string;
}

// Mock data for development
const mockNewsletters: NewsletterIssue[] = [
  {
    id: 'newsletter-1',
    title: 'SECiD Monthly - Enero 2025',
    issueNumber: 12,
    publishedAt: new Date('2025-01-15'),
    content: '<h2>Bienvenidos al Newsletter de Enero</h2><p>Este mes destacamos los logros de nuestra comunidad...</p>',
    excerpt: 'Resumen de los logros de nuestra comunidad en el inicio de 2025.',
    coverImage: '/images/newsletter-jan.jpg',
  },
  {
    id: 'newsletter-2',
    title: 'SECiD Monthly - Diciembre 2024',
    issueNumber: 11,
    publishedAt: new Date('2024-12-15'),
    content: '<h2>Cierre de Año 2024</h2><p>Un año increíble para SECiD con más de 500 nuevos miembros...</p>',
    excerpt: 'Un año increíble para SECiD con más de 500 nuevos miembros.',
    coverImage: '/images/newsletter-dec.jpg',
  },
  {
    id: 'newsletter-3',
    title: 'SECiD Monthly - Noviembre 2024',
    issueNumber: 10,
    publishedAt: new Date('2024-11-15'),
    content: '<h2>Especial Hackathon</h2><p>Resultados del primer hackathon de ciencia de datos...</p>',
    excerpt: 'Resultados del primer hackathon de ciencia de datos de SECiD.',
    coverImage: '/images/newsletter-nov.jpg',
  },
  {
    id: 'newsletter-4',
    title: 'SECiD Monthly - Octubre 2024',
    issueNumber: 9,
    publishedAt: new Date('2024-10-15'),
    content: '<h2>Conferencia Anual</h2><p>Todo sobre nuestra conferencia anual de ciencia de datos...</p>',
    excerpt: 'Todo sobre nuestra conferencia anual de ciencia de datos.',
    coverImage: '/images/newsletter-oct.jpg',
  },
  {
    id: 'newsletter-5',
    title: 'SECiD Monthly - Septiembre 2024',
    issueNumber: 8,
    publishedAt: new Date('2024-09-15'),
    content: '<h2>Nuevas Comisiones</h2><p>Lanzamos tres nuevas comisiones técnicas...</p>',
    excerpt: 'Lanzamos tres nuevas comisiones técnicas para nuestros miembros.',
    coverImage: '/images/newsletter-sep.jpg',
  },
];

export async function getNewsletterArchive(): Promise<NewsletterIssue[]> {
  if (isUsingMockAPI()) {
    return mockNewsletters;
  }

  try {
    const q = query(
      collection(db, 'newsletter_archive'),
      orderBy('publishedAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      publishedAt: doc.data().publishedAt?.toDate() || new Date(),
    })) as NewsletterIssue[];
  } catch (error) {
    console.error('Error fetching newsletter archive:', error);
    return mockNewsletters;
  }
}

export async function getNewsletter(id: string): Promise<NewsletterIssue | null> {
  if (isUsingMockAPI()) {
    return mockNewsletters.find((n) => n.id === id) || null;
  }

  try {
    const docRef = doc(db, 'newsletter_archive', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return mockNewsletters.find((n) => n.id === id) || null;
    return {
      id: snapshot.id,
      ...snapshot.data(),
      publishedAt: snapshot.data().publishedAt?.toDate() || new Date(),
    } as NewsletterIssue;
  } catch (error) {
    console.error('Error fetching newsletter:', error);
    return mockNewsletters.find((n) => n.id === id) || null;
  }
}
