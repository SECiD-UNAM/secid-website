import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ChevronRightIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TicketIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

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
    | 'conference';
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

export const EventList: React.FC<EventListProps> = ({ lang = 'es' }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>(
    'grid'
  );

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, filter, typeFilter, searchTerm]);

  const fetchEvents = async () => {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('status', '==', 'published'),
        orderBy('startDate', 'asc'),
        limit(50)
      );

      const snapshot = await getDocs(eventsQuery);
      const eventsList = snapshot['docs'].map((doc) => {
        const data = doc['data']();
        return {
          id: doc['id'],
          ...data,
          startDate: data['startDate']?.toDate() || new Date(),
          endDate: data?.endDate?.toDate() || new Date(),
          registrationDeadline: data['registrationDeadline']?.toDate(),
        } as Event;
      });

      setEvents(eventsList);
    } catch (error) {
      console.error('Error fetching events:', error);
      // Use mock data for development
      setEvents(getMockEvents());
    } finally {
      setLoading(false);
    }
  };

  const getMockEvents = (): Event[] => [
    {
      id: '1',
      title: 'Data Science Career Fair 2024',
      description: 'Connect with top companies looking for data science talent',
      type: 'career-fair',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000
      ),
      timezone: 'America/Mexico_City',
      duration: 240,
      location: {
        type: 'hybrid',
        venue: 'UNAM Campus Ciudad Universitaria',
        address: 'Avenida Universidad 3000, CDMX',
        virtualLink: 'https://meet.google.com/xyz',
        virtualPlatform: 'meet',
      },
      registrationRequired: true,
      registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      maxAttendees: 200,
      currentAttendees: 156,
      registrationFee: 0,
      imageUrl: '/images/career-fair.jpg',
      tags: ['career', 'networking', 'professional-development'],
      organizers: ['SECiD', 'UNAM'],
      status: 'published',
      featured: true,
    },
    {
      id: '2',
      title: 'Machine Learning Workshop: From Theory to Production',
      description: 'Learn how to deploy ML models in production environments',
      type: 'workshop',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000
      ),
      timezone: 'America/Mexico_City',
      duration: 180,
      location: {
        type: 'virtual',
        virtualLink: 'https://zoom.us/j/123456',
        virtualPlatform: 'zoom',
      },
      registrationRequired: true,
      registrationDeadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      maxAttendees: 100,
      currentAttendees: 45,
      registrationFee: 0,
      tags: ['machine-learning', 'workshop', 'technical'],
      organizers: ['SECiD Tech Committee'],
      status: 'published',
      featured: false,
    },
    {
      id: '3',
      title: 'Alumni Networking Happy Hour',
      description: 'Casual networking event for data science alumni',
      type: 'social',
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
      ),
      timezone: 'America/Mexico_City',
      duration: 120,
      location: {
        type: 'physical',
        venue: 'La Casa del Libro',
        address: 'Polanco, CDMX',
      },
      registrationRequired: false,
      maxAttendees: 50,
      currentAttendees: 23,
      registrationFee: 0,
      tags: ['networking', 'social', 'alumni'],
      organizers: ['SECiD Social Committee'],
      status: 'published',
      featured: false,
    },
  ];

  const filterEvents = () => {
    let filtered = [...events];

    // Time filter
    const now = new Date();
    if (filter === 'upcoming') {
      filtered = filtered.filter((e) => e.startDate >= now);
    } else if (filter === 'past') {
      filtered = filtered.filter((e) => e.startDate < now);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((e) => e['type'] === typeFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(search) ||
          e['description'].toLowerCase().includes(search) ||
          e.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    setFilteredEvents(filtered);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, Record<string, string>> = {
      workshop: { es: 'Taller', en: 'Workshop' },
      networking: { es: 'Networking', en: 'Networking' },
      'career-fair': { es: 'Feria de empleo', en: 'Career Fair' },
      webinar: { es: 'Webinar', en: 'Webinar' },
      social: { es: 'Social', en: 'Social' },
      conference: { es: 'Conferencia', en: 'Conference' },
    };
    return labels[type]?.[lang] || type;
  };

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      workshop:
        'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      networking:
        'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      'career-fair':
        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      webinar:
        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
      social:
        'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400',
      conference:
        'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400',
    };
    return (
      colors[type] ||
      'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
    );
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'virtual':
        return <VideoCameraIcon className="h-4 w-4" />;
      case 'physical':
        return <BuildingOfficeIcon className="h-4 w-4" />;
      case 'hybrid':
        return <MapPinIcon className="h-4 w-4" />;
      default:
        return <MapPinIcon className="h-4 w-4" />;
    }
  };

  const isEventFull = (event: Event): boolean => {
    return (
      event.maxAttendees > 0 && event.currentAttendees >= event.maxAttendees
    );
  };

  const isRegistrationOpen = (event: Event): boolean => {
    if (!event.registrationRequired) return true;
    if (event.registrationDeadline && new Date() > event.registrationDeadline)
      return false;
    return !isEventFull(event);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="mb-8 h-12 w-1/3 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          {lang === 'es' ? 'Eventos' : 'Events'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Participa en eventos, talleres y actividades de networking'
            : 'Join events, workshops and networking activities'}
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                lang === 'es' ? 'Buscar eventos...' : 'Search events...'
              }
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Time Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">{lang === 'es' ? 'Todos' : 'All'}</option>
            <option value="upcoming">
              {lang === 'es' ? 'Próximos' : 'Upcoming'}
            </option>
            <option value="past">{lang === 'es' ? 'Pasados' : 'Past'}</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">
              {lang === 'es' ? 'Todos los tipos' : 'All types'}
            </option>
            <option value="workshop">
              {lang === 'es' ? 'Talleres' : 'Workshops'}
            </option>
            <option value="networking">
              {lang === 'es' ? 'Networking' : 'Networking'}
            </option>
            <option value="career-fair">
              {lang === 'es' ? 'Ferias de empleo' : 'Career Fairs'}
            </option>
            <option value="webinar">
              {lang === 'es' ? 'Webinars' : 'Webinars'}
            </option>
            <option value="social">
              {lang === 'es' ? 'Sociales' : 'Social'}
            </option>
            <option value="conference">
              {lang === 'es' ? 'Conferencias' : 'Conferences'}
            </option>
          </select>

          {/* View Mode */}
          <div className="flex gap-2">
            {['grid', 'list', 'calendar'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  viewMode === mode
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {mode === 'grid' && '⊞'}
                {mode === 'list' && '☰'}
                {mode === 'calendar' && '📅'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {filteredEvents.length > 0 ? (
          <>
            {lang === 'es' ? 'Mostrando' : 'Showing'} {filteredEvents.length}{' '}
            {lang === 'es' ? 'eventos' : 'events'}
            {searchTerm && (
              <>
                {' '}
                {lang === 'es' ? 'para' : 'for'} "{searchTerm}"
              </>
            )}
          </>
        ) : lang === 'es' ? (
          'No se encontraron eventos'
        ) : (
          'No events found'
        )}
      </div>

      {/* Events Grid/List */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <div
              key={event['id']}
              className="overflow-hidden rounded-lg bg-white shadow transition-all hover:shadow-lg dark:bg-gray-800"
            >
              {/* Event Image */}
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
                {/* Featured Badge & Type */}
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(event['type'])}`}
                  >
                    {getEventTypeLabel(event['type'])}
                  </span>
                  {event.featured && (
                    <SparklesIcon className="h-5 w-5 text-yellow-500" />
                  )}
                </div>

                {/* Title */}
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {event.title}
                </h3>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                  {event['description']}
                </p>

                {/* Event Details */}
                <div className="mb-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(event.startDate)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <ClockIcon className="mr-2 h-4 w-4" />
                    {formatTime(event.startDate)} - {formatTime(event.endDate)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    {getLocationIcon(event.location['type'])}
                    <span className="ml-2">
                      {event.location['type'] === 'virtual'
                        ? lang === 'es'
                          ? 'Virtual'
                          : 'Virtual'
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

                {/* Registration Status */}
                {event.registrationRequired && (
                  <div className="mb-4">
                    {isEventFull(event) ? (
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {lang === 'es' ? 'Evento lleno' : 'Event full'}
                      </span>
                    ) : !isRegistrationOpen(event) ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {lang === 'es'
                          ? 'Registro cerrado'
                          : 'Registration closed'}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {lang === 'es'
                          ? 'Registro abierto'
                          : 'Registration open'}
                      </span>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <a
                  href={`/${lang}/dashboard/events/${event['id']}`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
                >
                  {lang === 'es' ? 'Ver detalles' : 'View details'}
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <div
              key={event['id']}
              className="rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getEventTypeColor(event['type'])}`}
                    >
                      {getEventTypeLabel(event['type'])}
                    </span>
                    {event.featured && (
                      <SparklesIcon className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>

                  <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    {event.title}
                  </h3>

                  <p className="mb-4 text-gray-600 dark:text-gray-400">
                    {event['description']}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <CalendarIcon className="mr-1 h-4 w-4" />
                      {formatDate(event.startDate)}
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="mr-1 h-4 w-4" />
                      {formatTime(event.startDate)}
                    </div>
                    <div className="flex items-center">
                      {getLocationIcon(event.location['type'])}
                      <span className="ml-1">
                        {event.location['type'] === 'virtual'
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

                <a
                  href={`/${lang}/dashboard/events/${event['id']}`}
                  className="ml-4 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
                >
                  {lang === 'es' ? 'Ver' : 'View'}
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <p className="text-center text-gray-600 dark:text-gray-400">
            <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            {lang === 'es'
              ? 'Vista de calendario próximamente'
              : 'Calendar view coming soon'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="py-12 text-center">
          <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            {lang === 'es' ? 'No se encontraron eventos' : 'No events found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? 'Intenta ajustar tus filtros o términos de búsqueda'
              : 'Try adjusting your filters or search terms'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EventList;
