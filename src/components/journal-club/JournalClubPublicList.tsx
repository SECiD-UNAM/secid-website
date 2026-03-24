import React, { useState, useEffect } from 'react';
import { getJournalClubSessions } from '@/lib/journal-club';
import type { JournalClubSession } from '@/lib/journal-club';
import {
  DocumentTextIcon,
  PresentationChartBarIcon,
  VideoCameraIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Journal Club', es: 'Journal Club' },
  subtitle: {
    en: 'Weekly paper discussions and presentations by our community.',
    es: 'Discusiones semanales de articulos y presentaciones de nuestra comunidad.',
  },
  paper: { en: 'Paper', es: 'Articulo' },
  slides: { en: 'Slides', es: 'Diapositivas' },
  recording: { en: 'Recording', es: 'Grabacion' },
  noSessions: {
    en: 'No sessions scheduled yet. Check back soon!',
    es: 'No hay sesiones programadas aun. Vuelve pronto!',
  },
  loading: { en: 'Loading sessions...', es: 'Cargando sesiones...' },
  upcoming: { en: 'Upcoming', es: 'Proxima' },
  past: { en: 'Past', es: 'Pasada' },
};

function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Resource link
// ---------------------------------------------------------------------------

function ResourceLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface JournalClubPublicListProps {
  lang?: 'es' | 'en';
}

export default function JournalClubPublicList({
  lang = 'es',
}: JournalClubPublicListProps) {
  const [sessions, setSessions] = useState<JournalClubSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getJournalClubSessions();
        if (!cancelled) setSessions(data);
      } catch (err) {
        console.error('Error fetching public journal club sessions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(
      lang === 'es' ? 'es-MX' : 'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
    );
  }

  function isUpcoming(date: Date): boolean {
    return new Date(date) >= new Date();
  }

  // -- Loading ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title', lang)}
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          {t('subtitle', lang)}
        </p>
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('noSessions', lang)}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <article
              key={session.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md dark:bg-gray-800"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {session.topic}
                    </h2>
                    {isUpcoming(session.date) && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {t('upcoming', lang)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{formatDate(session.date)}</span>
                    <span className="text-gray-400 dark:text-gray-500">
                      &middot;
                    </span>
                    <span>{session.presenter}</span>
                  </div>

                  {session.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.description}
                    </p>
                  )}

                  {session.tags && session.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {session.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-primary-50 px-2 py-0.5 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resource links */}
                {(session.paperUrl ||
                  session.slidesUrl ||
                  session.recordingUrl) && (
                  <div className="flex flex-wrap gap-2 sm:flex-col">
                    {session.paperUrl && (
                      <ResourceLink
                        href={session.paperUrl}
                        icon={DocumentTextIcon}
                        label={t('paper', lang)}
                      />
                    )}
                    {session.slidesUrl && (
                      <ResourceLink
                        href={session.slidesUrl}
                        icon={PresentationChartBarIcon}
                        label={t('slides', lang)}
                      />
                    )}
                    {session.recordingUrl && (
                      <ResourceLink
                        href={session.recordingUrl}
                        icon={VideoCameraIcon}
                        label={t('recording', lang)}
                      />
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
