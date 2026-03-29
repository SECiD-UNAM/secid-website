import { z } from 'zod';
import type { NewsletterIssue } from '@/lib/newsletter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NEWSLETTER_STATUSES = ['draft', 'published'] as const;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const newsletterFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  issueNumber: z.coerce.number().min(1, 'Issue number must be at least 1'),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000),
  excerpt: z
    .string()
    .min(10, 'Excerpt must be at least 10 characters')
    .max(300),
  coverImage: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(NEWSLETTER_STATUSES),
});

export type NewsletterFormData = z.infer<typeof newsletterFormSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NewsletterFormProps {
  lang?: 'es' | 'en';
  newsletterId?: string;
  newsletter?: NewsletterIssue;
}

// ---------------------------------------------------------------------------
// i18n labels
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Title', es: 'Titulo' },
  issueNumber: { en: 'Issue Number', es: 'Numero de edicion' },
  content: { en: 'Content (HTML)', es: 'Contenido (HTML)' },
  excerpt: { en: 'Excerpt', es: 'Extracto' },
  coverImage: { en: 'Cover Image URL', es: 'URL de imagen de portada' },
  status: { en: 'Status', es: 'Estado' },
  basicInfo: { en: 'Basic Information', es: 'Informacion basica' },
  contentSection: { en: 'Content', es: 'Contenido' },
  settings: { en: 'Settings', es: 'Configuracion' },
  submit: { en: 'Create Newsletter', es: 'Crear newsletter' },
  update: { en: 'Update Newsletter', es: 'Actualizar newsletter' },
  saving: { en: 'Saving...', es: 'Guardando...' },
  successCreate: {
    en: 'Newsletter created successfully!',
    es: 'Newsletter creado exitosamente!',
  },
  successUpdate: {
    en: 'Newsletter updated successfully!',
    es: 'Newsletter actualizado exitosamente!',
  },
  errorAuth: {
    en: 'You must be logged in to manage newsletters.',
    es: 'Debes iniciar sesion para gestionar newsletters.',
  },
  errorGeneric: {
    en: 'An error occurred. Please try again.',
    es: 'Ocurrio un error. Por favor intenta de nuevo.',
  },
  viewNewsletters: { en: 'View Newsletters', es: 'Ver newsletters' },
  createAnother: { en: 'Create Another', es: 'Crear otro' },
  notFound: {
    en: 'Newsletter not found.',
    es: 'Newsletter no encontrado.',
  },
};

export function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function newsletterToFormDefaults(
  newsletter: NewsletterIssue
): NewsletterFormData {
  return {
    title: newsletter.title,
    issueNumber: newsletter.issueNumber,
    content: newsletter.content,
    excerpt: newsletter.excerpt,
    coverImage: newsletter.coverImage ?? '',
    status: newsletter.status,
  };
}
