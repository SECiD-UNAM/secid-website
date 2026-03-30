import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
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

export const collections = { blog } as any;
