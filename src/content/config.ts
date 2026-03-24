import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // Astro 5 derives the file-system slug automatically; this field stores a
    // canonical slug that overrides the file-based one when present.
    slug: z.string().optional(),
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
