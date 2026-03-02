import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  eventFormSchema,
  eventToFormDefaults,
  t,
  EVENT_FORMATS,
  EVENT_TYPES,
  type EventFormData,
  type EventFormEvent,
  type EventFormProps,
} from './event-form-schema';

// ---------------------------------------------------------------------------
// Field wrapper (keeps form DRY)
// ---------------------------------------------------------------------------

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EventForm: React.FC<EventFormProps> = ({ lang = 'es', event, eventId }) => {
  const { user } = useAuth();
  const isEdit = !!(event || eventId);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!(eventId && !event));
  const [fetchedEvent, setFetchedEvent] = useState<EventFormEvent | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: event
      ? eventToFormDefaults(event)
      : {
          title: '',
          description: '',
          type: 'workshop',
          format: 'virtual',
          startDate: '',
          endDate: '',
          venue: '',
          address: '',
          meetingUrl: '',
          maxAttendees: 0,
          registrationDeadline: '',
          imageUrl: '',
          tags: '',
          isFree: true,
          price: 0,
          currency: 'MXN',
          contactEmail: user?.email ?? '',
          isFeatured: false,
          status: 'draft',
        },
  });

  // Fetch event data when only eventId is provided (edit page)
  useEffect(() => {
    if (event || !eventId) return;
    const fetchEvent = async () => {
      try {
        const snap = await getDoc(doc(db, 'events', eventId));
        if (!snap.exists()) {
          setSubmitError(lang === 'es' ? 'Evento no encontrado.' : 'Event not found.');
          setLoading(false);
          return;
        }
        const data = snap.data();
        const loaded: EventFormEvent = {
          id: snap.id,
          title: data.title ?? '',
          description: data.description ?? '',
          type: data.type ?? 'workshop',
          format: data.format,
          startDate: data.startDate?.toDate?.() ?? new Date(),
          endDate: data.endDate?.toDate?.() ?? new Date(),
          venue: data.venue ?? data.location?.venue,
          address: data.address ?? data.location?.address,
          meetingUrl: data.meetingUrl ?? data.location?.virtualLink,
          maxAttendees: data.maxAttendees,
          registrationDeadline: data.registrationDeadline?.toDate?.(),
          imageUrl: data.imageUrl,
          tags: data.tags,
          isFree: data.isFree,
          price: data.registrationFee ?? data.price,
          currency: data.currency,
          contactEmail: data.contactEmail,
          isFeatured: data.isFeatured ?? data.featured,
          status: data.status,
          location: data.location,
        };
        setFetchedEvent(loaded);
        reset(eventToFormDefaults(loaded));
      } catch (err) {
        console.error('Error fetching event:', err);
        setSubmitError(t('errorGeneric', lang));
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId, event, lang, reset]);

  const watchFormat = watch('format');
  const watchIsFree = watch('isFree');

  const onSubmit = async (data: EventFormData) => {
    if (!user) {
      setSubmitError(t('errorAuth', lang));
      return;
    }
    setSubmitError(null);

    const tagsArray = data.tags
      ? data.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
      : [];

    const eventDoc: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      type: data.type,
      format: data.format,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      location: {
        type: data.format === 'in-person' ? 'physical' : data.format,
        venue: data.venue || null,
        address: data.address || null,
        virtualLink: data.meetingUrl || null,
      },
      maxAttendees: data.maxAttendees || 0,
      registrationDeadline: data.registrationDeadline
        ? Timestamp.fromDate(new Date(data.registrationDeadline))
        : null,
      imageUrl: data.imageUrl || null,
      tags: tagsArray,
      isFree: data.isFree,
      registrationFee: data.isFree ? 0 : data.price ?? 0,
      currency: data.currency,
      contactEmail: data.contactEmail,
      isFeatured: data.isFeatured,
      status: data.status,
      updatedAt: serverTimestamp(),
    };

    try {
      if (isEdit) {
        const docId = eventId ?? event?.id ?? fetchedEvent?.id;
        if (!docId) throw new Error('Missing event ID');
        await updateDoc(doc(db, 'events', docId), eventDoc);
      } else {
        eventDoc.createdAt = serverTimestamp();
        eventDoc.createdBy = user.uid;
        eventDoc.currentAttendees = 0;
        eventDoc.registrationRequired = true;
        eventDoc.featured = data.isFeatured;
        await addDoc(collection(db, 'events'), eventDoc);
      }
      setSuccess(true);
    } catch (err) {
      console.error('Error saving event:', err);
      setSubmitError(t('errorGeneric', lang));
    }
  };

  // -- Loading skeleton (edit mode, fetching from Firestore) ------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
            <div className="mb-4 h-6 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-3">
              <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // -- Success screen ---------------------------------------------------------
  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <CheckCircleIcon className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? t('successUpdate', lang) : t('successCreate', lang)}
        </h2>
        <div className="mt-6 flex justify-center gap-4">
          <a
            href={`/${lang}/dashboard/events`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
          >
            {t('viewEvents', lang)}
          </a>
          {!isEdit && (
            <button
              type="button"
              onClick={() => { setSuccess(false); reset(); }}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('createAnother', lang)}
            </button>
          )}
        </div>
      </div>
    );
  }

  // -- Form -------------------------------------------------------------------
  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
  const sectionClass = 'rounded-lg bg-white p-6 shadow dark:bg-gray-800 mb-6';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Basic Information */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('basicInfo', lang)}</legend>
        <div className="space-y-4">
          <Field label={t('title', lang)} error={errors.title?.message}>
            <input {...register('title')} className={inputClass} />
          </Field>
          <Field label={t('description', lang)} error={errors.description?.message}>
            <textarea {...register('description')} rows={4} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('type', lang)} error={errors.type?.message}>
              <select {...register('type')} className={inputClass}>
                {EVENT_TYPES.map((et) => (<option key={et} value={et}>{et.replace('_', ' ')}</option>))}
              </select>
            </Field>
            <Field label={t('format', lang)} error={errors.format?.message}>
              <select {...register('format')} className={inputClass}>
                {EVENT_FORMATS.map((ef) => (<option key={ef} value={ef}>{ef}</option>))}
              </select>
            </Field>
          </div>
          <Field label={t('imageUrl', lang)} error={errors.imageUrl?.message}>
            <input {...register('imageUrl')} type="url" placeholder="https://..." className={inputClass} />
          </Field>
          <Field label={t('tags', lang)} error={errors.tags?.message}>
            <input {...register('tags')} placeholder="data-science, workshop, python" className={inputClass} />
          </Field>
        </div>
      </fieldset>

      {/* Date & Time */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('dateTime', lang)}</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t('startDate', lang)} error={errors.startDate?.message}>
            <input {...register('startDate')} type="datetime-local" className={inputClass} />
          </Field>
          <Field label={t('endDate', lang)} error={errors.endDate?.message}>
            <input {...register('endDate')} type="datetime-local" className={inputClass} />
          </Field>
        </div>
      </fieldset>

      {/* Location */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('location', lang)}</legend>
        <div className="space-y-4">
          {(watchFormat === 'in-person' || watchFormat === 'hybrid') && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('venue', lang)} error={errors.venue?.message}>
                <input {...register('venue')} className={inputClass} />
              </Field>
              <Field label={t('address', lang)} error={errors.address?.message}>
                <input {...register('address')} className={inputClass} />
              </Field>
            </div>
          )}
          {(watchFormat === 'virtual' || watchFormat === 'hybrid') && (
            <Field label={t('meetingUrl', lang)} error={errors.meetingUrl?.message}>
              <input {...register('meetingUrl')} type="url" placeholder="https://zoom.us/..." className={inputClass} />
            </Field>
          )}
        </div>
      </fieldset>

      {/* Registration & Pricing */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('registration', lang)}</legend>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('maxAttendees', lang)} error={errors.maxAttendees?.message}>
              <input {...register('maxAttendees')} type="number" min={0} className={inputClass} />
            </Field>
            <Field label={t('registrationDeadline', lang)} error={errors.registrationDeadline?.message}>
              <input {...register('registrationDeadline')} type="datetime-local" className={inputClass} />
            </Field>
          </div>
          <div className="flex items-center gap-3">
            <input {...register('isFree')} type="checkbox" id="isFree" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="isFree" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('isFree', lang)}</label>
          </div>
          {!watchIsFree && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('price', lang)} error={errors.price?.message}>
                <input {...register('price')} type="number" min={0} step="0.01" className={inputClass} />
              </Field>
              <Field label={t('currency', lang)} error={errors.currency?.message}>
                <select {...register('currency')} className={inputClass}>
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </Field>
            </div>
          )}
          <Field label={t('contactEmail', lang)} error={errors.contactEmail?.message}>
            <input {...register('contactEmail')} type="email" className={inputClass} />
          </Field>
        </div>
      </fieldset>

      {/* Settings */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('settings', lang)}</legend>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input {...register('isFeatured')} type="checkbox" id="isFeatured" className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('isFeatured', lang)}</label>
          </div>
          <Field label={t('status', lang)} error={errors.status?.message}>
            <select {...register('status')} className={inputClass}>
              <option value="draft">{lang === 'es' ? 'Borrador' : 'Draft'}</option>
              <option value="published">{lang === 'es' ? 'Publicado' : 'Published'}</option>
            </select>
          </Field>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-primary-600 px-8 py-3 font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? t('saving', lang) : isEdit ? t('update', lang) : t('submit', lang)}
        </button>
      </div>
    </form>
  );
};

export default EventForm;
