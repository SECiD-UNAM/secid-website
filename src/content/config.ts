import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    excerpt: z.string(),
    author: z.string(),
    category: z.enum(['Tendencias', 'Tutorial', 'Carrera', 'Investigación', 'Opinión']),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    featuredImage: z.string().optional(),
    lang: z.enum(['es', 'en']),
    translationOf: z.string().default(''),
    publishedAt: z.date(),
  }),
});

export const collections = { blog };
