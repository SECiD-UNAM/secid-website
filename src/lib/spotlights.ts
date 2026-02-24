import { db, isUsingMockAPI } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { AlumniSpotlight } from '@/types/spotlight';

const mockSpotlights: AlumniSpotlight[] = [
  {
    id: 'spotlight-1',
    name: 'María García López',
    title: 'Senior Data Scientist',
    company: 'Google',
    graduationYear: 2019,
    story: '<h2>Mi camino en la ciencia de datos</h2><p>Desde que me gradué de la UNAM, mi pasión por los datos me ha llevado a trabajar en proyectos increíbles...</p><p>En Google, lidero un equipo que desarrolla modelos de ML para mejorar la experiencia de búsqueda...</p>',
    excerpt:
      'De la UNAM a Google: cómo la ciencia de datos transformó mi carrera profesional.',
    featuredImage: '/images/spotlight-1.jpg',
    tags: ['Machine Learning', 'Google', 'Liderazgo'],
    publishedAt: new Date('2024-12-01'),
    featured: true,
    status: 'published',
  },
  {
    id: 'spotlight-2',
    name: 'Carlos Rodríguez Sánchez',
    title: 'Co-Founder & CTO',
    company: 'DataMX',
    graduationYear: 2018,
    story: '<h2>Emprendiendo con datos</h2><p>Después de graduarme, decidí que quería crear mi propia empresa enfocada en democratizar el acceso a herramientas de análisis de datos...</p>',
    excerpt:
      'Fundó DataMX, una startup que democratiza el análisis de datos para PyMEs mexicanas.',
    tags: ['Emprendimiento', 'Startup', 'Analytics'],
    publishedAt: new Date('2024-11-15'),
    featured: false,
    status: 'published',
  },
  {
    id: 'spotlight-3',
    name: 'Ana Martínez Ruiz',
    title: 'Research Scientist',
    company: 'Meta AI',
    graduationYear: 2020,
    story: '<h2>Investigación en NLP</h2><p>Mi pasión por el procesamiento de lenguaje natural comenzó en la UNAM durante mi proyecto de tesis...</p>',
    excerpt:
      'Investigadora en Meta AI trabajando en modelos de lenguaje multilingües.',
    tags: ['NLP', 'Investigación', 'Meta'],
    publishedAt: new Date('2024-10-20'),
    featured: false,
    status: 'published',
  },
  {
    id: 'spotlight-4',
    name: 'Roberto Hernández Vega',
    title: 'Head of Data Engineering',
    company: 'Mercado Libre',
    graduationYear: 2017,
    story: '<h2>Escalando datos en Latinoamérica</h2><p>En Mercado Libre, el reto es procesar millones de transacciones diarias...</p>',
    excerpt:
      'Lidera el equipo de ingeniería de datos que procesa millones de transacciones diarias.',
    tags: ['Data Engineering', 'Big Data', 'Mercado Libre'],
    publishedAt: new Date('2024-09-10'),
    featured: false,
    status: 'published',
  },
];

export async function getSpotlights(): Promise<AlumniSpotlight[]> {
  if (isUsingMockAPI()) {
    return mockSpotlights.filter((s) => s.status === 'published');
  }

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
    return mockSpotlights.filter((s) => s.status === 'published');
  }
}

export async function getSpotlight(
  id: string
): Promise<AlumniSpotlight | null> {
  if (isUsingMockAPI()) {
    return mockSpotlights.find((s) => s.id === id) || null;
  }

  try {
    const docRef = doc(db, 'spotlights', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return mockSpotlights.find((s) => s.id === id) || null;
    }
    return {
      id: snapshot.id,
      ...snapshot.data(),
      publishedAt: snapshot.data().publishedAt?.toDate() || new Date(),
    } as AlumniSpotlight;
  } catch (error) {
    console.error('Error fetching spotlight:', error);
    return mockSpotlights.find((s) => s.id === id) || null;
  }
}

export async function createSpotlight(
  spotlight: Omit<AlumniSpotlight, 'id' | 'publishedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'spotlights'), {
    ...spotlight,
    publishedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSpotlight(
  id: string,
  updates: Partial<AlumniSpotlight>
): Promise<void> {
  await updateDoc(doc(db, 'spotlights', id), updates);
}
