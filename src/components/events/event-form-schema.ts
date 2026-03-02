import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const EVENT_FORMATS = ['in-person', 'virtual', 'hybrid'] as const;
export const EVENT_TYPES = [
  'workshop',
  'webinar',
  'conference',
  'meetup',
  'networking',
  'hackathon',
  'social',
  'career_fair',
  'other',
] as const;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const eventFormSchema = z
  .object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(150),
    description: z
      .string()
      .min(50, 'Description must be at least 50 characters')
      .max(5000),
    type: z.enum(EVENT_TYPES),
    format: z.enum(EVENT_FORMATS),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    venue: z.string().max(100).optional().or(z.literal('')),
    address: z.string().max(200).optional().or(z.literal('')),
    meetingUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    maxAttendees: z.coerce.number().min(0).max(10000).optional(),
    registrationDeadline: z.string().optional().or(z.literal('')),
    imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    tags: z.string().optional(),
    isFree: z.boolean(),
    price: z.coerce.number().min(0).max(100000).optional(),
    currency: z.enum(['USD', 'MXN', 'EUR']),
    contactEmail: z.string().email('Must be a valid email'),
    isFeatured: z.boolean(),
    status: z.enum(['draft', 'published']),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.startDate) < new Date(data.endDate);
    },
    { message: 'End date must be after start date', path: ['endDate'] }
  )
  .refine(
    (data) => {
      if (data.format === 'in-person' || data.format === 'hybrid') {
        return !!data.venue;
      }
      return true;
    },
    { message: 'Venue is required for in-person/hybrid events', path: ['venue'] }
  )
  .refine(
    (data) => {
      if (data.format === 'virtual' || data.format === 'hybrid') {
        return !!data.meetingUrl;
      }
      return true;
    },
    { message: 'Meeting URL is required for virtual/hybrid events', path: ['meetingUrl'] }
  );

export type EventFormData = z.infer<typeof eventFormSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventFormEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  format?: string;
  startDate: Date | { toDate: () => Date };
  endDate: Date | { toDate: () => Date };
  venue?: string;
  address?: string;
  meetingUrl?: string;
  maxAttendees?: number;
  registrationDeadline?: Date | { toDate: () => Date };
  imageUrl?: string;
  tags?: string[];
  isFree?: boolean;
  price?: number;
  currency?: string;
  contactEmail?: string;
  isFeatured?: boolean;
  status?: string;
  location?: {
    type?: string;
    venue?: string;
    address?: string;
    virtualLink?: string;
  };
}

export interface EventFormProps {
  lang?: 'es' | 'en';
  event?: EventFormEvent;
  eventId?: string;
}

// ---------------------------------------------------------------------------
// i18n labels
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Title', es: 'Titulo' },
  description: { en: 'Description', es: 'Descripcion' },
  type: { en: 'Event Type', es: 'Tipo de evento' },
  format: { en: 'Format', es: 'Formato' },
  startDate: { en: 'Start Date & Time', es: 'Fecha y hora de inicio' },
  endDate: { en: 'End Date & Time', es: 'Fecha y hora de fin' },
  venue: { en: 'Venue', es: 'Sede' },
  address: { en: 'Address', es: 'Direccion' },
  meetingUrl: { en: 'Meeting URL', es: 'URL de reunion' },
  maxAttendees: { en: 'Max Attendees', es: 'Capacidad maxima' },
  registrationDeadline: { en: 'Registration Deadline', es: 'Fecha limite de registro' },
  imageUrl: { en: 'Banner Image URL', es: 'URL de imagen del banner' },
  tags: { en: 'Tags (comma separated)', es: 'Etiquetas (separadas por coma)' },
  isFree: { en: 'Free Event', es: 'Evento gratuito' },
  price: { en: 'Price', es: 'Precio' },
  currency: { en: 'Currency', es: 'Moneda' },
  contactEmail: { en: 'Contact Email', es: 'Email de contacto' },
  isFeatured: { en: 'Featured Event', es: 'Evento destacado' },
  status: { en: 'Status', es: 'Estado' },
  submit: { en: 'Create Event', es: 'Crear evento' },
  update: { en: 'Update Event', es: 'Actualizar evento' },
  saving: { en: 'Saving...', es: 'Guardando...' },
  successCreate: { en: 'Event created successfully!', es: 'Evento creado exitosamente!' },
  successUpdate: { en: 'Event updated successfully!', es: 'Evento actualizado exitosamente!' },
  errorAuth: {
    en: 'You must be logged in to manage events.',
    es: 'Debes iniciar sesion para gestionar eventos.',
  },
  errorGeneric: {
    en: 'An error occurred. Please try again.',
    es: 'Ocurrio un error. Por favor intenta de nuevo.',
  },
  viewEvents: { en: 'View Events', es: 'Ver eventos' },
  createAnother: { en: 'Create Another', es: 'Crear otro' },
  basicInfo: { en: 'Basic Information', es: 'Informacion basica' },
  dateTime: { en: 'Date & Time', es: 'Fecha y hora' },
  location: { en: 'Location', es: 'Ubicacion' },
  registration: { en: 'Registration & Pricing', es: 'Registro y precios' },
  settings: { en: 'Settings', es: 'Configuracion' },
};

export function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toDatetimeLocal(d: Date | { toDate: () => Date } | undefined): string {
  if (!d) return '';
  const date = typeof (d as { toDate?: () => Date }).toDate === 'function'
    ? (d as { toDate: () => Date }).toDate()
    : (d as Date);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function resolveFormat(event: EventFormEvent): 'in-person' | 'virtual' | 'hybrid' {
  if (event.format && (EVENT_FORMATS as readonly string[]).includes(event.format)) {
    return event.format as 'in-person' | 'virtual' | 'hybrid';
  }
  if (event.location?.type) {
    const mapping: Record<string, 'in-person' | 'virtual' | 'hybrid'> = {
      physical: 'in-person',
      virtual: 'virtual',
      hybrid: 'hybrid',
    };
    return mapping[event.location.type] ?? 'in-person';
  }
  return 'in-person';
}

export function eventToFormDefaults(ev: EventFormEvent): EventFormData {
  return {
    title: ev.title,
    description: ev.description,
    type: ((EVENT_TYPES as readonly string[]).includes(ev.type) ? ev.type : 'workshop') as EventFormData['type'],
    format: resolveFormat(ev),
    startDate: toDatetimeLocal(ev.startDate),
    endDate: toDatetimeLocal(ev.endDate),
    venue: ev.venue ?? ev.location?.venue ?? '',
    address: ev.address ?? ev.location?.address ?? '',
    meetingUrl: ev.meetingUrl ?? ev.location?.virtualLink ?? '',
    maxAttendees: ev.maxAttendees ?? 0,
    registrationDeadline: toDatetimeLocal(ev.registrationDeadline),
    imageUrl: ev.imageUrl ?? '',
    tags: ev.tags?.join(', ') ?? '',
    isFree: ev.isFree ?? true,
    price: ev.price ?? 0,
    currency: (['USD', 'MXN', 'EUR'].includes(ev.currency ?? '') ? ev.currency : 'MXN') as EventFormData['currency'],
    contactEmail: ev.contactEmail ?? '',
    isFeatured: ev.isFeatured ?? false,
    status: (ev.status === 'published' ? 'published' : 'draft') as EventFormData['status'],
  };
}
