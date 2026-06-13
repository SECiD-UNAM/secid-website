import { z } from 'zod';
import type { JournalClubSession } from '@/lib/journal-club';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SESSION_STATUSES = ['draft', 'published', 'cancelled'] as const;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const journalClubFormSchema = z.object({
  topic: z.string().min(5, 'Topic must be at least 5 characters').max(200),
  presenter: z.string().min(2, 'Presenter name required').max(100),
  date: z.string().min(1, 'Date is required'),
  description: z.string().max(5000).optional().or(z.literal('')),
  paperUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  slidesUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  recordingUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  status: z.enum(SESSION_STATUSES),
  tags: z.string().optional(),
});

export type JournalClubFormData = z.infer<typeof journalClubFormSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JournalClubFormProps {
  lang?: 'es' | 'en';
  sessionId?: string;
  session?: JournalClubSession;
}

// ---------------------------------------------------------------------------
// i18n labels
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  topic: { en: 'Topic', es: 'Tema' },
  presenter: { en: 'Presenter', es: 'Presentador' },
  date: { en: 'Date', es: 'Fecha' },
  description: { en: 'Description', es: 'Descripcion' },
  paperUrl: { en: 'Paper URL', es: 'URL del articulo' },
  slidesUrl: { en: 'Slides URL', es: 'URL de las diapositivas' },
  recordingUrl: { en: 'Recording URL', es: 'URL de la grabacion' },
  status: { en: 'Status', es: 'Estado' },
  tags: { en: 'Tags (comma separated)', es: 'Etiquetas (separadas por coma)' },
  basicInfo: { en: 'Basic Information', es: 'Informacion basica' },
  resources: { en: 'Resources', es: 'Recursos' },
  settings: { en: 'Settings', es: 'Configuracion' },
  submit: { en: 'Create Session', es: 'Crear sesion' },
  update: { en: 'Update Session', es: 'Actualizar sesion' },
  saving: { en: 'Saving...', es: 'Guardando...' },
  successCreate: {
    en: 'Session created successfully!',
    es: 'Sesion creada exitosamente!',
  },
  successUpdate: {
    en: 'Session updated successfully!',
    es: 'Sesion actualizada exitosamente!',
  },
  errorAuth: {
    en: 'You must be logged in to manage journal club sessions.',
    es: 'Debes iniciar sesion para gestionar sesiones del journal club.',
  },
  errorGeneric: {
    en: 'An error occurred. Please try again.',
    es: 'Ocurrio un error. Por favor intenta de nuevo.',
  },
  viewSessions: { en: 'View Sessions', es: 'Ver sesiones' },
  createAnother: { en: 'Create Another', es: 'Crear otra' },
  notFound: {
    en: 'Session not found.',
    es: 'Sesion no encontrada.',
  },
};

export function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toDatetimeLocal(
  d: Date | { toDate: () => Date } | undefined
): string {
  if (!d) return '';
  const date =
    typeof (d as { toDate?: () => Date }).toDate === 'function'
      ? (d as { toDate: () => Date }).toDate()
      : (d as Date);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function sessionToFormDefaults(
  session: JournalClubSession
): JournalClubFormData {
  return {
    topic: session.topic,
    presenter: session.presenter,
    date: toDatetimeLocal(session.date),
    description: session.description ?? '',
    paperUrl: session.paperUrl ?? '',
    slidesUrl: session.slidesUrl ?? '',
    recordingUrl: session.recordingUrl ?? '',
    status: session.status,
    tags: session.tags?.join(', ') ?? '',
  };
}
