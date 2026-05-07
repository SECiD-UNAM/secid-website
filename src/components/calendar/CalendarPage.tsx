import React, { useState } from 'react';
import {
  CalendarIcon,
  BookOpenIcon,
  LightBulbIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Activity Calendar', es: 'Calendario de Actividades' },
  subtitle: {
    en: 'All upcoming SECiD sessions, events, and community activities.',
    es: 'Todas las sesiones, eventos y actividades de la comunidad SECiD.',
  },
  journalClub: { en: 'Journal Club', es: 'Journal Club' },
  knowledgeExchange: { en: 'Knowledge Exchange', es: 'Knowledge Exchange' },
  presenter: { en: 'Presenter', es: 'Presentador' },
  tbd: { en: 'TBD', es: 'Por definir' },
  upcoming: { en: 'Upcoming', es: 'Próxima' },
  completed: { en: 'Completed', es: 'Completada' },
  viewAll: { en: 'All Events', es: 'Todos los Eventos' },
  viewMonth: { en: 'Monthly View', es: 'Vista Mensual' },
  noEvents: {
    en: 'No events this month.',
    es: 'Sin eventos este mes.',
  },
  listView: { en: 'List', es: 'Lista' },
  monthView: { en: 'Month', es: 'Mes' },
  today: { en: 'Today', es: 'Hoy' },
  previousMonth: { en: 'Previous month', es: 'Mes anterior' },
  nextMonth: { en: 'Next month', es: 'Mes siguiente' },
};

function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export interface CalendarActivity {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'journal-club' | 'knowledge-exchange';
  topic?: string;
  presenter?: string;
}

const ACTIVITIES: CalendarActivity[] = [
  // Past Journal Club sessions
  { id: 'jc-1', date: '2026-03-04', type: 'journal-club', topic: 'NLP Foundations', presenter: 'Fernando Avitua' },
  { id: 'jc-2', date: '2026-03-18', type: 'journal-club', topic: 'Attention Is All You Need', presenter: 'Fernando Avitua' },
  { id: 'jc-3', date: '2026-04-01', type: 'journal-club', topic: 'BERT', presenter: 'Artemio Padilla' },
  { id: 'jc-4', date: '2026-04-15', type: 'journal-club', topic: 'GPTs', presenter: 'Alejandro Ramirez Bondi' },
  { id: 'jc-5', date: '2026-04-29', type: 'journal-club', topic: 'LLaMA', presenter: 'Eduardo Garduño' },
  { id: 'jc-6', date: '2026-05-13', type: 'journal-club', topic: 'DeepSeek', presenter: 'Iván Barón' },
  // Upcoming Journal Club
  { id: 'jc-7', date: '2026-11-18', type: 'journal-club' },
  { id: 'jc-8', date: '2027-02-17', type: 'journal-club' },
  { id: 'jc-9', date: '2027-04-21', type: 'journal-club' },
  // Knowledge Exchange (TBD)
  { id: 'ke-1', date: '2026-10-21', type: 'knowledge-exchange' },
  { id: 'ke-2', date: '2027-01-21', type: 'knowledge-exchange' },
  { id: 'ke-3', date: '2027-03-17', type: 'knowledge-exchange' },
  { id: 'ke-4', date: '2027-05-19', type: 'knowledge-exchange' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPast(dateStr: string): boolean {
  return new Date(dateStr + 'T23:59:00') < new Date();
}

function formatDate(dateStr: string, lang: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(
    lang === 'es' ? 'es-MX' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );
}

function formatMonthYear(year: number, month: number, lang: string): string {
  return new Date(year, month, 1).toLocaleDateString(
    lang === 'es' ? 'es-MX' : 'en-US',
    { month: 'long', year: 'numeric' }
  );
}

// ---------------------------------------------------------------------------
// Activity badge
// ---------------------------------------------------------------------------

function ActivityBadge({
  activity,
  lang,
  compact = false,
}: {
  activity: CalendarActivity;
  lang: string;
  compact?: boolean;
}) {
  const isJC = activity.type === 'journal-club';
  const past = isPast(activity.date);

  const colorClass = isJC
    ? past
      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      : 'bg-blue-100 border-blue-300 dark:bg-blue-900/40 dark:border-blue-700'
    : past
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
    : 'bg-amber-100 border-amber-300 dark:bg-amber-900/40 dark:border-amber-700';

  const iconClass = isJC
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-amber-600 dark:text-amber-400';

  const textClass = isJC
    ? 'text-blue-800 dark:text-blue-300'
    : 'text-amber-800 dark:text-amber-300';

  if (compact) {
    return (
      <div
        className={`rounded px-1.5 py-0.5 text-xs font-medium border ${colorClass} ${textClass} truncate`}
        title={activity.topic ?? t(isJC ? 'journalClub' : 'knowledgeExchange', lang)}
      >
        {isJC ? '📖' : '💡'}{' '}
        {activity.topic ?? t(isJC ? 'journalClub' : 'knowledgeExchange', lang)}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 flex gap-3 items-start ${colorClass} ${past ? 'opacity-65' : ''}`}
    >
      <div className={`mt-0.5 flex-shrink-0 ${iconClass}`}>
        {isJC ? (
          <BookOpenIcon className="h-5 w-5" />
        ) : (
          <LightBulbIcon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${iconClass}`}>
            {t(isJC ? 'journalClub' : 'knowledgeExchange', lang)}
          </span>
          {past ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {t('completed', lang)}
            </span>
          ) : (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isJC ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200' : 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'}`}>
              {t('upcoming', lang)}
            </span>
          )}
        </div>
        <p className={`mt-1 text-sm font-medium ${textClass}`}>
          {activity.topic ?? <em className="font-normal opacity-70">{t('tbd', lang)}</em>}
        </p>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 capitalize">
          {formatDate(activity.date, lang)}
        </p>
        {activity.presenter && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
            {t('presenter', lang)}: {activity.presenter}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function ListView({ lang }: { lang: string }) {
  const sorted = [...ACTIVITIES].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const upcoming = sorted.filter((a) => !isPast(a.date));
  const past = sorted.filter((a) => isPast(a.date)).reverse();

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {lang === 'es' ? 'Próximas Actividades' : 'Upcoming Activities'}
          </h3>
          <div className="space-y-3">
            {upcoming.map((a) => (
              <ActivityBadge key={a.id} activity={a} lang={lang} />
            ))}
          </div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h3 className="mb-4 text-base font-semibold text-gray-700 dark:text-gray-300 border-b pb-2">
            {lang === 'es' ? 'Actividades Pasadas' : 'Past Activities'}
          </h3>
          <div className="space-y-3">
            {past.map((a) => (
              <ActivityBadge key={a.id} activity={a} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Month Grid View
// ---------------------------------------------------------------------------

function MonthView({ lang }: { lang: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid (6 rows x 7 cols)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const activitiesThisMonth = ACTIVITIES.filter((a) => {
    const d = new Date(a.date + 'T12:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const dayLabels = lang === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          aria-label={t('previousMonth', lang)}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h3 className="text-base font-semibold capitalize text-gray-900 dark:text-white">
          {formatMonthYear(year, month, lang)}
        </h3>
        <button
          onClick={nextMonth}
          aria-label={t('nextMonth', lang)}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
            {d}
          </div>
        ))}
        {/* Day cells */}
        {cells.map((day, idx) => {
          const dayActivities = day
            ? activitiesThisMonth.filter(
                (a) => new Date(a.date + 'T12:00:00').getDate() === day
              )
            : [];
          const isToday =
            day === now.getDate() &&
            month === now.getMonth() &&
            year === now.getFullYear();

          return (
            <div
              key={idx}
              className={`min-h-[60px] rounded-lg p-1 text-xs ${
                day ? 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700' : ''
              } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
            >
              {day && (
                <>
                  <span
                    className={`block text-right font-medium mb-1 ${
                      isToday
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayActivities.map((a) => (
                      <ActivityBadge key={a.id} activity={a} lang={lang} compact />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Events this month summary */}
      {activitiesThisMonth.length === 0 ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">
          {t('noEvents', lang)}
        </p>
      ) : (
        <div className="space-y-2 pt-2">
          {activitiesThisMonth.map((a) => (
            <ActivityBadge key={a.id} activity={a} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CalendarPage component
// ---------------------------------------------------------------------------

interface CalendarPageProps {
  lang?: 'es' | 'en';
}

export default function CalendarPage({ lang = 'es' }: CalendarPageProps) {
  const [view, setView] = useState<'list' | 'month'>('list');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            {t('title', lang)}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t('subtitle', lang)}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden self-start">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('listView', lang)}
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              view === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('monthView', lang)}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <BookOpenIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-gray-600 dark:text-gray-400">{t('journalClub', lang)}</span>
        </div>
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="text-gray-600 dark:text-gray-400">{t('knowledgeExchange', lang)}</span>
        </div>
      </div>

      {/* View */}
      {view === 'list' ? (
        <ListView lang={lang} />
      ) : (
        <MonthView lang={lang} />
      )}
    </div>
  );
}
