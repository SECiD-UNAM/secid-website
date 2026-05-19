import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  createNewsletter,
  updateNewsletter,
  getNewsletter,
} from '@/lib/newsletter';
import type { NewsletterIssue } from '@/lib/newsletter';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  newsletterFormSchema,
  newsletterToFormDefaults,
  t,
  NEWSLETTER_STATUSES,
  type NewsletterFormData,
  type NewsletterFormProps,
} from './newsletter-form-schema';

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
  };
  return map[status]?.[lang] ?? status;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewsletterForm({
  lang = 'es',
  newsletterId,
  newsletter,
}: NewsletterFormProps) {
  const { user } = useAuth();
  const isEdit = !!(newsletter || newsletterId);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!(newsletterId && !newsletter));
  const [fetchedNewsletter, setFetchedNewsletter] =
    useState<NewsletterIssue | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterFormData>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: newsletter
      ? newsletterToFormDefaults(newsletter)
      : {
          title: '',
          issueNumber: 1,
          content: '',
          excerpt: '',
          coverImage: '',
          status: 'draft',
        },
  });

  // Fetch newsletter data when only newsletterId is provided (edit page)
  useEffect(() => {
    if (newsletter || !newsletterId) return;
    let cancelled = false;

    async function fetchNewsletter() {
      try {
        const loaded = await getNewsletter(newsletterId!);
        if (cancelled) return;
        if (!loaded) {
          setSubmitError(t('notFound', lang));
          setLoading(false);
          return;
        }
        setFetchedNewsletter(loaded);
        reset(newsletterToFormDefaults(loaded));
      } catch {
        if (!cancelled) setSubmitError(t('errorGeneric', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNewsletter();
    return () => {
      cancelled = true;
    };
  }, [newsletterId, newsletter, lang, reset]);

  const onSubmit = async (data: NewsletterFormData) => {
    if (!user) {
      setSubmitError(t('errorAuth', lang));
      return;
    }
    setSubmitError(null);

    const newsletterPayload = {
      title: data.title,
      issueNumber: data.issueNumber,
      content: data.content,
      excerpt: data.excerpt,
      coverImage: data.coverImage || undefined,
      status: data.status,
      publishedAt:
        data.status === 'published'
          ? (Timestamp.now() as unknown as Date)
          : (Timestamp.fromDate(new Date()) as unknown as Date),
      createdBy: user.uid,
    };

    try {
      if (isEdit) {
        const docId = newsletterId ?? newsletter?.id ?? fetchedNewsletter?.id;
        if (!docId) throw new Error('Missing newsletter ID');
        await updateNewsletter(docId, newsletterPayload, user.uid);
      } else {
        await createNewsletter(newsletterPayload, user.uid);
      }
      setSuccess(true);
    } catch (err) {
      console.error('Error saving newsletter:', err);
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
            href={`/${lang}/dashboard/newsletter`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700"
          >
            {t('viewNewsletters', lang)}
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
          <Field label={t('title', lang)} error={errors.title?.message}>
            <input {...register('title')} className={inputClass} />
          </Field>
          <Field
            label={t('issueNumber', lang)}
            error={errors.issueNumber?.message}
          >
            <input
              {...register('issueNumber')}
              type="number"
              min={1}
              className={inputClass}
            />
          </Field>
          <Field label={t('excerpt', lang)} error={errors.excerpt?.message}>
            <textarea
              {...register('excerpt')}
              rows={2}
              className={inputClass}
            />
          </Field>
          <Field
            label={t('coverImage', lang)}
            error={errors.coverImage?.message}
          >
            <input
              {...register('coverImage')}
              type="url"
              placeholder="https://example.com/image.jpg"
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      {/* Content */}
      <fieldset className={sectionClass}>
        <legend className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('contentSection', lang)}
        </legend>
        <div className="space-y-4">
          <Field label={t('content', lang)} error={errors.content?.message}>
            <textarea
              {...register('content')}
              rows={12}
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
              {NEWSLETTER_STATUSES.map((s) => (
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
