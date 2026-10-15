/**
 * Full-screen views for non-CV states: loading spinner, error message,
 * and access-denied (private CV / members-only) views.
 */
import React from 'react';
import { getLabels } from '@/lib/cv/labels';

export function LoadingView({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--color-surface-light)' }}
    >
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"
          style={{
            borderColor: 'var(--color-border)',
            borderTopColor: 'var(--color-primary)',
          }}
        />
        <p style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

export function ErrorView({
  message,
  detail,
  backHref,
  backLabel,
}: {
  message: string;
  detail: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--color-surface-light)' }}
    >
      <div
        className="mx-auto max-w-md rounded-2xl p-8 text-center shadow-sm"
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ background: 'var(--color-surface-light)' }}
        >
          :(
        </div>
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ color: 'var(--color-heading)' }}
        >
          {message}
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {detail}
        </p>
        <a
          href={backHref}
          className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}
        >
          {backLabel}
        </a>
      </div>
    </div>
  );
}

export function AccessDeniedView({
  message,
  lang,
}: {
  message: string;
  lang: 'es' | 'en';
}) {
  const labels = getLabels(lang);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'var(--color-surface-light)' }}
    >
      <div
        className="mx-auto max-w-md rounded-2xl p-8 text-center shadow-sm"
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgb(245 158 11 / 0.15)' }}
        >
          <svg
            className="h-8 w-8"
            style={{ color: '#f59e0b' }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2
          className="mb-4 text-xl font-bold"
          style={{ color: 'var(--color-heading)' }}
        >
          {message}
        </h2>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`/${lang}/login`}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {labels.signIn}
          </a>
          <a
            href={`/${lang}/members`}
            className="text-sm"
            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            {labels.memberDirectory}
          </a>
        </div>
      </div>
    </div>
  );
}
