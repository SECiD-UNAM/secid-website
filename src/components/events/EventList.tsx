import React, { useState, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePermissions } from '@/lib/rbac/hooks';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import type { FilterDefinition } from '@lib/listing/types';
import {
  ListingSearch,
  ListingFilters,
  ListingViewToggle,
  ListingPagination,
  ListingEmpty,
  ListingLoading,
} from '@components/listing';

interface Event {
  id: string;
  title: string;
  description: string;
  type:
    | 'workshop'
    | 'networking'
    | 'career-fair'
    | 'webinar'
    | 'social'
    | 'conference'
    | 'journal-club';
  startDate: Date;
  endDate: Date;
  timezone: string;
  duration: number;
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    venue?: string;
    address?: string;
    virtualLink?: string;
    virtualPlatform?: string;
  };
  registrationRequired: boolean;
  registrationDeadline?: Date;
  maxAttendees: number;
  currentAttendees: number;
  registrationFee: number;
  imageUrl?: string;
  tags: string[];
  organizers: string[];
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  featured: boolean;
}

interface EventListProps {
  lang?: 'es' | 'en';
}

// ---------------------------------------------------------------------------
// Static helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date, lang: 'es' | 'en'): string {
  return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(date: Date, lang: 'es' | 'en'): string {
  return date.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getEventTypeLabel(type: string, lang: 'es' | 'en'): string {
  const labels: Record<string, Record<string, string>> = {
    workshop: { es: 'Taller', en: 'Workshop' },
    networking: { es: 'Networking', en: 'Networking' },
    'career-fair': { es: 'Feria de empleo', en: 'Career Fair' },
    webinar: { es: 'Webinar', en: 'Webinar' },
    social: { es: 'Social', en: 'Social' },
    conference: { es: 'Conferencia', en: 'Conference' },
  };
  return labels[type]?.[lang] ?? type;
}

function getEventTypeColor(type: string): string {
  const colors: Record<string, string> = {
    workshop:
      'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    networking:
      'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
    'career-fair':
      'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    webinar:
      'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    social: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400',
    conference:
      'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
  };
  return (
    colors[type] ??
    'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
  );
}

function getLocationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'virtual':
      return <VideoCameraIcon className="h-4 w-4" />;
    case 'physical':
      return <BuildingOfficeIcon className="h-4 w-4" />;
    default:
      return <MapPinIcon className="h-4 w-4" />;
  }
}

function isEventFull(event: Event): boolean {
  return event.maxAttendees > 0 && event.currentAttendees >= event.maxAttendees;
}

function isRegistrationOpen(event: Event): boolean {
  if (!event.registrationRequired) return true;
  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    return false;
  }
  return !isEventFull(event);
}

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const TRANSLATIONS = {
  es: {
    timeFilter: {
      all: 'Todos',
      upcoming: 'Próximos',
      past: 'Pasados',
    },
    typeFilter: {
      all: 'Todos los tipos',
      workshop: 'Talleres',
      networking: 'Networking',
      'career-fair': 'Ferias de empleo',
      webinar: 'Webinars',
      social: 'Sociales',
      conference: 'Conferencias',
      'journal-club': 'Journal Club',
    },
    viewLabels: {
      listing: 'Lista',
      calendar: 'Calendario',
    },
    calendarPlaceholder: 'Vista de calendario próximamente',
    viewDetails: 'Ver detalles',
    newEvent: 'Nuevo Evento',
    edit: 'Editar',
    delete: 'Eliminar',
    confirmDelete: 'Estas seguro de que deseas eliminar este evento?',
  },
  en: {
    timeFilter: {
      all: 'All',
      upcoming: 'Upcoming',
      past: 'Past',
    },
    typeFilter: {
      all: 'All types',
      workshop: 'Workshops',
      networking: 'Networking',
      'career-fair': 'Career Fairs',
      webinar: 'Webinars',
      social: 'Social',
      conference: 'Conferences',
      'journal-club': 'Journal Club',
    },
    viewLabels: {
      listing: 'List',
      calendar: 'Calendar',
    },
    calendarPlaceholder: 'Calendar view coming soon',
    viewDetails: 'View details',
    newEvent: 'New Event',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this event?',
  },
} as const;

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------

function buildFilterDefinitions(lang: 'es' | 'en'): FilterDefinition[] {
  const t = TRANSLATIONS[lang];
  return [
    {
      key: 'type',
      label: lang === 'es' ? 'Tipo' : 'Type',
      type: 'select',
      placeholder: t.typeFilter.all,
      options: [
        { value: 'workshop', label: t.typeFilter.workshop },
        { value: 'networking', label: t.typeFilter.networking },
        { value: 'career-fair', label: t.typeFilter['career-fair'] },
        { value: 'webinar', label: t.typeFilter.webinar },
        { value: 'social', label: t.typeFilter.social },
        { value: 'conference', label: t.typeFilter.conference },
        { value: 'journal-club', label: t.typeFilter['journal-club'] },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

async function fetchAllEvents(): Promise<Event[]> {
  // Fetch regular events
  const eventsQuery = query(
    collection(db, 'events'),
    where('status', '==', 'published'),
    orderBy('startDate', 'asc'),
    limit(50)
  );
  const eventsSnap = await getDocs(eventsQuery);
  const events: Event[] = eventsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      startDate: data['startDate']?.toDate() ?? new Date(),
      endDate: data['endDate']?.toDate() ?? new Date(),
      registrationDeadline: data['registrationDeadline']?.toDate(),
    } as Event;
  });

  // Fetch journal club sessions and transform to Event shape
  try {
    const jcQuery = query(
      collection(db, 'journal_club_sessions'),
      where('status', '==', 'published'),
      orderBy('date', 'desc'),
      limit(50)
    );
    const jcSnap = await getDocs(jcQuery);
    const jcEvents: Event[] = jcSnap.docs.map((d) => {
      const data = d.data();
      const sessionDate = data['date']?.toDate() ?? new Date();
      const endDate = new Date(sessionDate.getTime() + 90 * 60 * 1000); // 90 min default
      return {
        id: `jc-${d.id}`,
        title: `Journal Club: ${data['topic'] || ''}`,
        description: data['description'] || '',
        type: 'journal-club' as const,
        startDate: sessionDate,
        endDate,
        timezone: 'America/Mexico_City',
        duration: 90,
        location: {
          type: 'virtual' as const,
          virtualPlatform: 'Google Meet',
        },
        registrationRequired: false,
        maxAttendees: 0,
        currentAttendees: 0,
        registrationFee: 0,
        tags: data['tags'] || ['journal-club'],
        organizers: [data['presenter'] || 'SECiD'],
        status: 'published' as const,
        featured: false,
      };
    });
    events.push(...jcEvents);
  } catch (err) {
    console.warn('Failed to load journal club sessions for events:', err);
  }

  // Sort all by startDate ascending
  events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return events;
}

function buildAdapter(): ClientSideAdapter<Event> {
  return new ClientSideAdapter<Event>({
    fetchAll: fetchAllEvents,
    searchFields: ['title', 'description'],
    getId: (event) => event.id,
    toSearchable: (event) =>
      [event.title, event.description, ...event.tags].join(' '),
  });
}

// ---------------------------------------------------------------------------
// Rendering sub-components
// ---------------------------------------------------------------------------

interface EventCardActions {
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (event: Event) => void;
}

function EventCardGrid({
  event,
  lang,
  actions,
}: {
  event: Event;
  lang: 'es' | 'en';
  actions: EventCardActions;
}) {
  const t = TRANSLATIONS[lang];
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-lg dark:bg-gray-800">
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt={event.title}
          className="h-48 w-full object-cover"
        />
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600">
          <CalendarIcon className="h-16 w-16 text-white opacity-50" />
        </div>
      )}

      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(event.type)}`}
          >
            {getEventTypeLabel(event.type, lang)}
          </span>
          <div className="flex items-center gap-1">
            {event.featured && (
              <SparklesIcon className="h-5 w-5 text-yellow-500" />
            )}
            {actions.canEdit && (
              <a
                href={`/${lang}/dashboard/events/edit/${event.id}`}
                title={t.edit}
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-primary-400"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </a>
            )}
            {actions.canDelete && (
              <button
                type="button"
                onClick={() => actions.onDelete(event)}
                title={t.delete}
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-red-400"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          {event.title}
        </h3>

        <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {event.description}
        </p>

        <div className="mb-4 space-y-2">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDate(event.startDate, lang)}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <ClockIcon className="mr-2 h-4 w-4" />
            {formatTime(event.startDate, lang)} -{' '}
            {formatTime(event.endDate, lang)}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            {getLocationIcon(event.location.type)}
            <span className="ml-2">
              {event.location.type === 'virtual'
                ? 'Virtual'
                : event.location.venue}
            </span>
          </div>
          {event.registrationRequired && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <UserGroupIcon className="mr-2 h-4 w-4" />
              {event.currentAttendees}/{event.maxAttendees}{' '}
              {lang === 'es' ? 'asistentes' : 'attendees'}
            </div>
          )}
        </div>

        {event.registrationRequired && (
          <div className="mb-4">
            {isEventFull(event) ? (
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {lang === 'es' ? 'Evento lleno' : 'Event full'}
              </span>
            ) : !isRegistrationOpen(event) ? (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Registro cerrado' : 'Registration closed'}
              </span>
            ) : (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                {lang === 'es' ? 'Registro abierto' : 'Registration open'}
              </span>
            )}
          </div>
        )}

        <a
          href={`/${lang}/dashboard/events/${event.id}`}
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
        >
          {t.viewDetails}
          <ChevronRightIcon className="ml-2 h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function EventCardList({
  event,
  lang,
  actions,
}: {
  event: Event;
  lang: 'es' | 'en';
  actions: EventCardActions;
}) {
  const t = TRANSLATIONS[lang];
  return (
    <div className="rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(event.type)}`}
            >
              {getEventTypeLabel(event.type, lang)}
            </span>
            {event.featured && (
              <SparklesIcon className="h-5 w-5 text-yellow-500" />
            )}
          </div>

          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {event.title}
          </h3>

          <p className="mb-4 text-gray-600 dark:text-gray-400">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <CalendarIcon className="mr-1 h-4 w-4" />
              {formatDate(event.startDate, lang)}
            </div>
            <div className="flex items-center">
              <ClockIcon className="mr-1 h-4 w-4" />
              {formatTime(event.startDate, lang)}
            </div>
            <div className="flex items-center">
              {getLocationIcon(event.location.type)}
              <span className="ml-1">
                {event.location.type === 'virtual'
                  ? 'Virtual'
                  : event.location.venue}
              </span>
            </div>
            {event.registrationRequired && (
              <div className="flex items-center">
                <UserGroupIcon className="mr-1 h-4 w-4" />
                {event.currentAttendees}/{event.maxAttendees}
              </div>
            )}
          </div>
        </div>

        <div className="ml-4 flex items-center gap-2">
          {actions.canEdit && (
            <a
              href={`/${lang}/dashboard/events/edit/${event.id}`}
              title={t.edit}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-primary-400"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </a>
          )}
          {actions.canDelete && (
            <button
              type="button"
              onClick={() => actions.onDelete(event)}
              title={t.delete}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-red-400"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
          <a
            href={`/${lang}/dashboard/events/${event.id}`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
          >
            {lang === 'es' ? 'Ver' : 'View'}
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const EventList: React.FC<EventListProps> = ({ lang = 'es' }) => {
  const t = TRANSLATIONS[lang];
  const { can } = usePermissions();

  const canCreate = can('events', 'create');
  const canEdit = can('events', 'edit');
  const canDelete = can('events', 'delete');

  const [calendarMode, setCalendarMode] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>(
    'upcoming'
  );
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const adapter = useMemo(() => buildAdapter(), []);

  const filterDefinitions = useMemo(
    () => buildFilterDefinitions(lang),
    [lang]
  );

  const {
    items,
    loading,
    query,
    setQuery,
    activeFilters,
    setFilter,
    clearFilters,
    viewMode,
    setViewMode,
    page,
    totalPages,
    hasMore,
    goToPage,
    loadMore,
  } = useUniversalListing<Event>({
    adapter,
    defaultViewMode: 'grid',
    paginationMode: 'offset',
    defaultPageSize: 12,
    defaultSort: { field: 'startDate', direction: 'asc' },
    filterDefinitions,
    lang,
  });

  const handleDelete = useCallback(
    async (event: Event) => {
      if (!confirm(t.confirmDelete)) return;
      // Optimistically hide the event
      setDeletedIds((prev) => new Set(prev).add(event.id));
      try {
        await deleteDoc(doc(db, 'events', event.id));
      } catch (err) {
        console.error('Error deleting event:', err);
        // Rollback: remove the ID so the event reappears
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(event.id);
          return next;
        });
      }
    },
    [t.confirmDelete]
  );

  const cardActions: EventCardActions = useMemo(
    () => ({ canEdit, canDelete, onDelete: handleDelete }),
    [canEdit, canDelete, handleDelete]
  );

  // Time filter applied post-hook (requires date comparison against now)
  const displayedItems = useMemo(() => {
    let result = items.filter((e) => !deletedIds.has(e.id));
    if (timeFilter === 'all') return result;
    const now = new Date();
    return timeFilter === 'upcoming'
      ? result.filter((e) => e.startDate >= now)
      : result.filter((e) => e.startDate < now);
  }, [items, timeFilter, deletedIds]);

  const hasActiveFilters =
    timeFilter !== 'upcoming' ||
    Object.values(activeFilters).some(
      (v) => v !== undefined && v !== null && v !== ''
    ) ||
    !!query;

  const handleClearAll = () => {
    setTimeFilter('upcoming');
    clearFilters();
    setQuery('');
  };

  return (
    <div>
      {/* Header with New Event button */}
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <a
            href={`/${lang}/dashboard/events/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t.newEvent}
          </a>
        </div>
      )}

      {/* Top tab bar: Listing vs Calendar */}
      <div className="mb-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setCalendarMode(false)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            !calendarMode
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          {t.viewLabels.listing}
        </button>
        <button
          type="button"
          onClick={() => setCalendarMode(true)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            calendarMode
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <CalendarIcon className="mr-1 inline h-4 w-4" />
          {t.viewLabels.calendar}
        </button>
      </div>

      {/* Calendar view (custom domain code) */}
      {calendarMode && (
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <p className="text-center text-gray-600 dark:text-gray-400">
            <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            {t.calendarPlaceholder}
          </p>
        </div>
      )}

      {/* Listing view */}
      {!calendarMode && (
        <>
          {/* Toolbar: search + time filter tabs + view toggle */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="flex-1">
                <ListingSearch
                  query={query}
                  onQueryChange={setQuery}
                  lang={lang}
                />
              </div>

              {/* Time filter tabs */}
              <div className="flex gap-1">
                {(['upcoming', 'all', 'past'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeFilter(key)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      timeFilter === key
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {t.timeFilter[key]}
                  </button>
                ))}
              </div>

              {/* View toggle (grid / list only) */}
              <ListingViewToggle
                viewMode={viewMode}
                availableModes={['grid', 'list']}
                onViewModeChange={setViewMode}
                lang={lang}
              />
            </div>

            {/* Type filter row */}
            <div className="mt-3">
              <ListingFilters
                definitions={filterDefinitions}
                activeFilters={activeFilters}
                onFilterChange={setFilter}
                onClearAll={handleClearAll}
                filterMode="visible"
                lang={lang}
              />
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? `${displayedItems.length} eventos`
              : `${displayedItems.length} events`}
            {query && (
              <span>
                {' '}
                {lang === 'es' ? 'para' : 'for'} &ldquo;{query}&rdquo;
              </span>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && <ListingLoading viewMode={viewMode} count={6} />}

          {/* Empty state */}
          {!loading && displayedItems.length === 0 && (
            <ListingEmpty
              lang={lang}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearAll}
              title={
                lang === 'es'
                  ? 'No se encontraron eventos'
                  : 'No events found'
              }
              description={
                lang === 'es'
                  ? 'Intenta ajustar tus filtros o términos de búsqueda'
                  : 'Try adjusting your filters or search terms'
              }
            />
          )}

          {/* Grid view */}
          {!loading && displayedItems.length > 0 && viewMode === 'grid' && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayedItems.map((event) => (
                <EventCardGrid key={event.id} event={event} lang={lang} actions={cardActions} />
              ))}
            </div>
          )}

          {/* List view */}
          {!loading && displayedItems.length > 0 && viewMode === 'list' && (
            <div className="space-y-4">
              {displayedItems.map((event) => (
                <EventCardList key={event.id} event={event} lang={lang} actions={cardActions} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <ListingPagination
            page={page}
            totalPages={totalPages}
            hasMore={hasMore}
            paginationMode="offset"
            onPageChange={goToPage}
            onLoadMore={loadMore}
            loading={loading}
            lang={lang}
          />
        </>
      )}
    </div>
  );
};

export default EventList;
