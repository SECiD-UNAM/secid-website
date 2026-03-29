import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  createJournalClubSession,
  updateJournalClubSession,
  getJournalClubSession,
} from '@/lib/journal-club';
import type { JournalClubSession } from '@/lib/journal-club';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  journalClubFormSchema,
  sessionToFormDefaults,
  t,
  SESSION_STATUSES,
  type JournalClubFormData,
  type JournalClubFormProps,
} from './journal-club-form-schema';

// ---------------------------------------------------------------------------
// Field wrapper (keeps form DRY)
// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status label helper
// ---------------------------------------------------------------------------

function statusLabel(status: string, lang: string): string {
  const map: Record<string, Record<string, string>> = {
    draft: { en: 'Draft', es: 'Borrador' },
    published: { en: 'Published', es: 'Publicado' },
    cancelled: { en: 'Cancelled', es: 'Cancelado' },
  };
  return map[status]?.[lang] ?? status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JournalClubForm({
  lang = 'es',
  sessionId,
  session,
}: JournalClubFormProps) {
  const { user } = useAuth();
  const isEdit = !!(session || sessionId);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!(sessionId && !session));
  const [fetchedSession, setFetchedSession] =
    useState<JournalClubSession | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JournalClubFormData>({
    resolver: zodResolver(journalClubFormSchema),
    defaultValues: session
      ? sessionToFormDefaults(session)
      : {
          topic: '',
          presenter: '',
          date: '',
          description: '',
          paperUrl: '',
          slidesUrl: '',
          recordingUrl: '',
          status: 'draft',
          tags: '',
        },
  });

  // Fetch session data when only sessionId is provided (edit page)
  useEffect(() => {
    if (session || !sessionId) return;
    let cancelled = false;

    async function fetchSession() {
      try {
        const loaded = await getJournalClubSession(sessionId!);
        if (cancelled) return;
        if (!loaded) {
          setSubmitError(t('notFound', lang));
          setLoading(false);
          return;
        }
        setFetchedSession(loaded);
        reset(sessionToFormDefaults(loaded));
      } catch {
        if (!cancelled) setSubmitError(t('errorGeneric', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId, session, lang, reset]);

  const onSubmit = async (data: JournalClubFormData) => {
    if (!user) {
      setSubmitError(t('errorAuth', lang));
      return;
    }
    setSubmitError(null);

    const tagsArray = data.tags
      ? data.tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const sessionPayload = {
      topic: data.topic,
      presenter: data.presenter,
      date: Timestamp.fromDate(new Date(data.date)) as unknown as Date,
      description: data.description || undefined,
      paperUrl: data.paperUrl || undefined,
      slidesUrl: data.slidesUrl || undefined,
      recordingUrl: data.recordingUrl || undefined,
      status: data.status,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
    };

    try {
      if (isEdit) {
        const docId = sessionId ?? session?.id ?? fetchedSession?.id;
        if (!docId) throw new Error('Missing session ID');
        await updateJournalClubSession(docId, sessionPayload, user.uid);
      } else {
        await createJournalClubSession(sessionPayload, user.uid);
      }
      setSuccess(true);
    } catch (err) {
      console.error('Error saving journal club session:', err);
      setSubmitError(t('errorGeneric', lang));
    }
  };

  // -- Loading skeleton (edit mode, fetching from Firestore) ------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg bg-white p-6 shadow dark:bg-gray-800"
          >
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
            href={`/${lang}/dashboard/journal-club`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
          >
            {t('viewSessions', lang)}
          </a>
          {!isEdit && (
            <button
              type="button"
              onClick={() => {
                setSuccess(false);
                reset();
              }}
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-3xl space-y-6"
    >
      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Basic Information */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('basicInfo', lang)}
        </legend>
        <div className="space-y-4">
          <Field label={t('topic', lang)} error={errors.topic?.message}>
            <input {...register('topic')} className={inputClass} />
          </Field>
          <Field label={t('presenter', lang)} error={errors.presenter?.message}>
            <input {...register('presenter')} className={inputClass} />
          </Field>
          <Field label={t('date', lang)} error={errors.date?.message}>
            <input
              {...register('date')}
              type="datetime-local"
              className={inputClass}
            />
          </Field>
          <Field
            label={t('description', lang)}
            error={errors.description?.message}
          >
            <textarea
              {...register('description')}
              rows={4}
              className={inputClass}
            />
          </Field>
          <Field label={t('tags', lang)} error={errors.tags?.message}>
            <input
              {...register('tags')}
              placeholder="nlp, transformers, deep-learning"
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      {/* Resources */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('resources', lang)}
        </legend>
        <div className="space-y-4">
          <Field label={t('paperUrl', lang)} error={errors.paperUrl?.message}>
            <input
              {...register('paperUrl')}
              type="url"
              placeholder="https://arxiv.org/..."
              className={inputClass}
            />
          </Field>
          <Field label={t('slidesUrl', lang)} error={errors.slidesUrl?.message}>
            <input
              {...register('slidesUrl')}
              type="url"
              placeholder="https://docs.google.com/..."
              className={inputClass}
            />
          </Field>
          <Field
            label={t('recordingUrl', lang)}
            error={errors.recordingUrl?.message}
          >
            <input
              {...register('recordingUrl')}
              type="url"
              placeholder="https://youtube.com/..."
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      {/* Settings */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('settings', lang)}
        </legend>
        <div className="space-y-4">
          <Field label={t('status', lang)} error={errors.status?.message}>
            <select {...register('status')} className={inputClass}>
              {SESSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s, lang)}
                </option>
              ))}
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
          {isSubmitting
            ? t('saving', lang)
            : isEdit
              ? t('update', lang)
              : t('submit', lang)}
        </button>
      </div>
    </form>
  );
}
