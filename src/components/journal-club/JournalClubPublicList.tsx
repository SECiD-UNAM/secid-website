import React, { useState, useEffect } from 'react';
import { getJournalClubSessions } from '@/lib/journal-club';
import type { JournalClubSession } from '@/lib/journal-club';
import {
  DocumentTextIcon,
  PresentationChartBarIcon,
  VideoCameraIcon,
  CalendarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Journal Club', es: 'Journal Club' },
  subtitle: {
    en: 'Weekly paper discussions and presentations by our community.',
    es: 'Discusiones semanales de artículos y presentaciones de nuestra comunidad.',
  },
  paper: { en: 'Paper', es: 'Artículo' },
  slides: { en: 'Slides', es: 'Diapositivas' },
  recording: { en: 'Recording', es: 'Grabación' },
  noSessions: {
    en: 'No sessions scheduled yet. Check back soon!',
    es: 'No hay sesiones programadas aún. ¡Vuelve pronto!',
  },
  loading: { en: 'Loading sessions...', es: 'Cargando sesiones...' },
  upcoming: { en: 'Upcoming', es: 'Próxima' },
  past: { en: 'Past', es: 'Pasada' },
  presenter: { en: 'Presenter', es: 'Presentador' },
  topic: { en: 'Topic', es: 'Tema' },
  date: { en: 'Date', es: 'Fecha' },
  sessionSchedule: { en: 'Session Schedule', es: 'Calendario de Sesiones' },
  scheduleSubtitle: {
    en: 'Explore our upcoming and past Journal Club sessions.',
    es: 'Explora nuestras sesiones pasadas y próximas del Journal Club.',
  },
  tbd: { en: 'TBD', es: 'Por definir' },
  status: { en: 'Status', es: 'Estado' },
  confirmed: { en: 'Confirmed', es: 'Confirmado' },
  upcomingLabel: { en: 'Upcoming', es: 'Próxima' },
  completedLabel: { en: 'Completed', es: 'Completada' },
  liveSessionsTitle: { en: 'Live from Firestore', es: 'Sesiones en vivo' },
};

function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Static session data (hardcoded curriculum + upcoming dates)
// ---------------------------------------------------------------------------

interface StaticSession {
  id: string;
  date: string; // ISO date string
  topic: string;
  presenter: string;
  type: 'journal-club' | 'knowledge-exchange';
  status: 'completed' | 'upcoming' | 'tbd';
}

const STATIC_SESSIONS: StaticSession[] = [
  // Upcoming Journal Club sessions (curriculum order)
  {
    id: 'jc-1',
    date: '2026-05-24',
    topic: 'NLP Foundations',
    presenter: 'Fernando Avitua',
    type: 'journal-club',
    status: 'upcoming',
  },
  {
    id: 'jc-2',
    date: '2026-09-18',
    topic: 'Attention Is All You Need',
    presenter: 'Fernando Avitua',
    type: 'journal-club',
    status: 'upcoming',
  },
  {
    id: 'jc-3',
    date: '2026-11-20',
    topic: 'BERT',
    presenter: 'Artemio Padilla',
    type: 'journal-club',
    status: 'upcoming',
  },
  {
    id: 'jc-4',
    date: '2027-02-19',
    topic: 'GPTs',
    presenter: 'Alejandro Ramirez Bondi',
    type: 'journal-club',
    status: 'upcoming',
  },
  {
    id: 'jc-5',
    date: '2027-04-23',
    topic: 'LLaMA',
    presenter: 'Eduardo Garduño',
    type: 'journal-club',
    status: 'upcoming',
  },
];

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
// Static session card
// ---------------------------------------------------------------------------

function StaticSessionCard({
  session,
  lang,
}: {
  session: StaticSession;
  lang: string;
}) {
  const dateObj = new Date(session.date + 'T18:00:00'); // 6pm
  const formattedDate = dateObj.toLocaleDateString(
    lang === 'es' ? 'es-MX' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );

  const isCompleted = session.status === 'completed';
  const isUpcoming = session.status === 'upcoming';
  const presenterIsTBD = session.presenter === 'TBD';

  return (
    <article
      className={`rounded-lg bg-white p-5 shadow transition-shadow hover:shadow-md dark:bg-gray-800 ${
        isCompleted ? 'opacity-75' : ''
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-1.5">
          {/* Topic */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {session.topic}
            </h3>
            {isUpcoming && !isCompleted && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {t('upcomingLabel', lang)}
              </span>
            )}
            {isCompleted && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                {t('completedLabel', lang)}
              </span>
            )}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
            <span className="capitalize">{formattedDate}</span>
          </div>

          {/* Presenter */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <UserIcon className="h-4 w-4 flex-shrink-0" />
            <span>
              {presenterIsTBD ? (
                <em className="text-gray-400">{t('tbd', lang)}</em>
              ) : (
                session.presenter
              )}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Firestore session card (for published dynamic sessions)
// ---------------------------------------------------------------------------

function FirestoreSessionCard({
  session,
  lang,
}: {
  session: JournalClubSession;
  lang: string;
}) {
  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString(
      lang === 'es' ? 'es-MX' : 'en-US',
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  function isUpcoming(date: Date): boolean {
    return new Date(date) >= new Date();
  }

  return (
    <article className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md dark:bg-gray-800 border-l-4 border-blue-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {session.topic}
            </h3>
            {isUpcoming(session.date) && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                {t('upcoming', lang)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4" />
            <span>{formatDate(session.date)}</span>
            <span className="text-gray-400">·</span>
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

        {(session.paperUrl || session.slidesUrl || session.recordingUrl) && (
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
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface JournalClubPublicListProps {
  lang?: 'es' | 'en';
}

export default function JournalClubPublicList({
  lang = 'es',
}: JournalClubPublicListProps) {
  const [firestoreSessions, setFirestoreSessions] = useState<
    JournalClubSession[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getJournalClubSessions();
        if (!cancelled) setFirestoreSessions(data);
      } catch (err) {
        console.error('Error fetching journal club sessions:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Split static sessions into upcoming vs completed
  const now = new Date();
  const upcomingSessions = STATIC_SESSIONS.filter(
    (s) => new Date(s.date + 'T18:00:00') >= now
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastSessions = STATIC_SESSIONS.filter(
    (s) => new Date(s.date + 'T18:00:00') < now
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Firestore sessions (if any published) */}
      {firestoreSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {t('liveSessionsTitle', lang)}
          </h3>
          <div className="space-y-4">
            {firestoreSessions.map((s) => (
              <FirestoreSessionCard key={s.id} session={s} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming static sessions */}
      {upcomingSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {lang === 'es' ? 'Próximas Sesiones' : 'Upcoming Sessions'}
          </h3>
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <StaticSessionCard key={s.id} session={s} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Past static sessions */}
      {pastSessions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {lang === 'es' ? 'Sesiones Pasadas' : 'Past Sessions'}
          </h3>
          <div className="space-y-3">
            {pastSessions.map((s) => (
              <StaticSessionCard key={s.id} session={s} lang={lang} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
