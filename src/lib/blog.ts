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

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  authorId: string;
  authorName: string;
  publishedAt: Date;
  tags: string[];
  category: string;
  featured: boolean;
  featuredImage?: string;
  status: 'draft' | 'published';
}

export interface BlogFilters {
  category?: string;
  tag?: string;
  search?: string;
  status?: 'draft' | 'published';
  limit?: number;
}

const mockBlogPosts: BlogPost[] = [
  {
    id: 'blog-1',
    title: 'El Futuro de la Ciencia de Datos en México',
    slug: 'futuro-ciencia-datos-mexico',
    excerpt:
      'Exploramos las tendencias emergentes y oportunidades en el campo de la ciencia de datos en el contexto mexicano.',
    content:
      '<h2>Introducción</h2><p>La ciencia de datos está transformando industrias en todo México...</p><h2>Tendencias Clave</h2><p>Desde la IA generativa hasta el MLOps, las tendencias clave para 2025 incluyen...</p>',
    authorId: 'author-1',
    authorName: 'Dr. María Hernández',
    publishedAt: new Date('2024-12-15'),
    tags: ['Tendencias', 'México', 'Carrera'],
    category: 'Tendencias',
    featured: true,
    featuredImage: '/images/blog-1.jpg',
    status: 'published',
  },
  {
    id: 'blog-2',
    title: 'Implementando MLOps: Una Guía Práctica',
    slug: 'implementando-mlops-guia-practica',
    excerpt:
      'Aprende cómo implementar prácticas de MLOps en tu organización para escalar modelos de ML.',
    content:
      '<h2>¿Qué es MLOps?</h2><p>MLOps es un conjunto de prácticas que combina Machine Learning...</p>',
    authorId: 'author-2',
    authorName: 'Carlos Mendoza',
    publishedAt: new Date('2024-12-10'),
    tags: ['MLOps', 'DevOps', 'Tutorial'],
    category: 'Tutorial',
    featured: false,
    status: 'published',
  },
  {
    id: 'blog-3',
    title: 'De Analista a Chief Data Officer: Mi Historia',
    slug: 'analista-chief-data-officer-historia',
    excerpt:
      'Comparto mi trayectoria profesional y las lecciones aprendidas en el camino.',
    content:
      '<h2>Los Inicios</h2><p>Todo comenzó en 2010 cuando obtuve mi primer trabajo como analista...</p>',
    authorId: 'author-3',
    authorName: 'Ana Ramírez',
    publishedAt: new Date('2024-12-05'),
    tags: ['Carrera', 'Liderazgo', 'Experiencia'],
    category: 'Carrera',
    featured: false,
    status: 'published',
  },
  {
    id: 'blog-4',
    title: 'NLP con Transformers: Estado del Arte',
    slug: 'nlp-transformers-estado-arte',
    excerpt:
      'Una revisión completa de los últimos avances en procesamiento de lenguaje natural.',
    content:
      '<h2>La Revolución Transformer</h2><p>Desde la publicación de "Attention is All You Need"...</p>',
    authorId: 'author-4',
    authorName: 'Roberto Silva',
    publishedAt: new Date('2024-12-01'),
    tags: ['NLP', 'Deep Learning', 'Transformers'],
    category: 'Investigación',
    featured: false,
    status: 'published',
  },
  {
    id: 'blog-5',
    title: 'Ética en IA: Desafíos y Soluciones',
    slug: 'etica-ia-desafios-soluciones',
    excerpt:
      'Discutimos los principales desafíos éticos en inteligencia artificial.',
    content:
      '<h2>El Dilema Ético</h2><p>La inteligencia artificial plantea preguntas fundamentales...</p>',
    authorId: 'author-5',
    authorName: 'Laura Gutiérrez',
    publishedAt: new Date('2024-11-28'),
    tags: ['Ética', 'IA', 'Sociedad'],
    category: 'Opinión',
    featured: false,
    status: 'published',
  },
  {
    id: 'blog-6',
    title: 'Optimización de Consultas SQL para Big Data',
    slug: 'optimizacion-consultas-sql-big-data',
    excerpt:
      'Técnicas avanzadas para optimizar el rendimiento de consultas SQL.',
    content:
      '<h2>Fundamentos</h2><p>Cuando trabajamos con grandes volúmenes de datos...</p>',
    authorId: 'author-6',
    authorName: 'Pedro Martínez',
    publishedAt: new Date('2024-11-20'),
    tags: ['SQL', 'Big Data', 'Optimización'],
    category: 'Tutorial',
    featured: false,
    status: 'published',
  },
];

export async function getBlogPosts(filters?: BlogFilters): Promise<BlogPost[]> {
  if (isUsingMockAPI()) {
    let posts = [...mockBlogPosts];
    if (filters?.category && filters.category !== 'all') {
      posts = posts.filter((p) => p.category === filters.category);
    }
    if (filters?.tag) {
      posts = posts.filter((p) => p.tags.includes(filters.tag!));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q)
      );
    }
    if (filters?.status) {
      posts = posts.filter((p) => p.status === filters.status);
    }
    return posts.slice(0, filters?.limit || 50);
  }

  try {
    const constraints: any[] = [
      orderBy('publishedAt', 'desc'),
      limit(filters?.limit || 50),
    ];
    if (filters?.status) {
      constraints.unshift(where('status', '==', filters.status));
    }
    const q = query(collection(db, 'blog'), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      publishedAt: d.data().publishedAt?.toDate() || new Date(),
    })) as BlogPost[];
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return mockBlogPosts;
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (isUsingMockAPI()) {
    return (
      mockBlogPosts.find((p) => p.slug === slug || p.id === slug) || null
    );
  }

  try {
    // Try by slug first
    const q = query(
      collection(db, 'blog'),
      where('slug', '==', slug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty && snapshot.docs[0]) {
      const d = snapshot.docs[0];
      return {
        id: d.id,
        ...d.data(),
        publishedAt: d.data().publishedAt?.toDate() || new Date(),
      } as BlogPost;
    }
    // Fallback: try by ID
    const docRef = doc(db, 'blog', slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        publishedAt: docSnap.data().publishedAt?.toDate() || new Date(),
      } as BlogPost;
    }
    return (
      mockBlogPosts.find((p) => p.slug === slug || p.id === slug) || null
    );
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return (
      mockBlogPosts.find((p) => p.slug === slug || p.id === slug) || null
    );
  }
}

export async function createBlogPost(
  post: Omit<BlogPost, 'id' | 'publishedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, 'blog'), {
    ...post,
    publishedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateBlogPost(
  id: string,
  updates: Partial<BlogPost>
): Promise<void> {
  const docRef = doc(db, 'blog', id);
  await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
}
