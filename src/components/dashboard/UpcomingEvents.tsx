import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ClockIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'workshop' | 'career-fair' | 'networking' | 'webinar' | 'social';
  startDate: Date;
  endDate: Date;
  location: {
    type: 'physical' | 'virtual' | 'hybrid';
    venue?: string;
    address?: string;
    virtualPlatform?: string;
  };
  registrationRequired: boolean;
  maxAttendees: number;
  currentAttendees: number;
  isRegistered?: boolean;
  imageUrl?: string;
}

interface UpcomingEventsProps {
  lang?: 'es' | 'en';
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({
  lang = 'es',
}) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!user) return;

      try {
        // Fetch upcoming events
        const eventsQuery = query(
          collection(db, 'events'),
          where('startDate', '>=', Timestamp.now()),
          where('status', '==', 'published'),
          orderBy('startDate', 'asc'),
          limit(3)
        );

        const snapshot = await getDocs(eventsQuery);
        const fetchedEvents = snapshot['docs'].map((doc) => {
          const data = doc['data']();
          return {
            id: doc['id'],
            title: data['title'],
            description: data['description'],
            type: data['type'],
            startDate: data['startDate']?.toDate() || new Date(),
            endDate: data['endDate']?.toDate() || new Date(),
            location: data.location,
            registrationRequired: data['registrationRequired'],
            maxAttendees: data['maxAttendees'],
            currentAttendees: data['currentAttendees'],
            imageUrl: data['imageUrl'],
          } as Event;
        });

        // Check registration status for each event
        // In production, this would be a batch query
        const eventsWithRegistration = fetchedEvents.map((event) => ({
          ...event,
          isRegistered: false, // Would check actual registration status
        }));

        setEvents(eventsWithRegistration);
      } catch (error) {
        console.error('Error fetching events:', error);
        // Set mock data on error
        setEvents([
          {
            id: '1',
            title:
              lang === 'es'
                ? 'Feria de Empleo Data Science 2024'
                : 'Data Science Career Fair 2024',
            description:
              lang === 'es'
                ? 'Conecta con las mejores empresas de tecnología'
                : 'Connect with top tech companies',
            type: 'career-fair',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            endDate: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000
            ), // +8 hours
            location: {
              type: 'physical',
              venue: 'UNAM Campus Ciudad Universitaria',
              address: 'Avenida Universidad 3000, CDMX',
            },
            registrationRequired: true,
            maxAttendees: 200,
            currentAttendees: 145,
            isRegistered: false,
          },
          {
            id: '2',
            title: lang === 'es' ? 'Taller de MLOps' : 'MLOps Workshop',
            description:
              lang === 'es'
                ? 'Aprende a desplegar modelos en producción'
                : 'Learn to deploy models in production',
            type: 'workshop',
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            endDate: new Date(
              Date.now() + 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
            ), // +2 hours
            location: {
              type: 'virtual',
              virtualPlatform: 'Zoom',
            },
            registrationRequired: true,
            maxAttendees: 100,
            currentAttendees: 67,
            isRegistered: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [user, lang]);

  const formatEventDate = (startDate: Date, endDate: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    const start = startDate.toLocaleDateString(
      lang === 'es' ? 'es-MX' : 'en-US',
      options
    );
    const endTime = endDate.toLocaleTimeString(
      lang === 'es' ? 'es-MX' : 'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );

    return `${start} - ${endTime}`;
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, Record<string, string>> = {
      workshop: { es: 'Taller', en: 'Workshop' },
      'career-fair': { es: 'Feria de Empleo', en: 'Career Fair' },
      networking: { es: 'Networking', en: 'Networking' },
      webinar: { es: 'Webinar', en: 'Webinar' },
      social: { es: 'Social', en: 'Social' },
    };
    return labels[type]?.[lang] || type;
  };

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      workshop:
        'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      'career-fair':
        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      networking:
        'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      webinar:
        'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
      social:
        'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400',
    };
    return (
      colors[type] ||
      'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-400'
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-white shadow dark:bg-gray-800 dark:border dark:border-gray-700/30"
          >
            <div className="h-48 rounded-t-xl bg-gray-200 dark:bg-gray-700"></div>
            <div className="p-6">
              <div className="mb-2 h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow dark:bg-gray-800 dark:border dark:border-gray-700/30">
        <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">
          {lang === 'es' ? 'No hay eventos próximos' : 'No upcoming events'}
        </p>
        <a
          href={`/${lang}/dashboard/events`}
          className="mt-4 inline-block text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {lang === 'es' ? 'Ver eventos pasados' : 'View past events'}
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <div
          key={event['id']}
          className="rounded-xl bg-white shadow transition-all hover:shadow-lg hover:-translate-y-1 dark:bg-gray-800 dark:border dark:border-gray-700/30"
        >
          {/* Event Image or Placeholder */}
          <div className="relative h-48 rounded-t-lg bg-gradient-to-br from-primary-500 to-primary-700">
            <div className="absolute inset-0 flex items-center justify-center">
              <CalendarIcon className="h-20 w-20 text-white/20" />
            </div>
            <div className="absolute left-4 top-4">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventTypeColor(event['type'])}`}
              >
                {getEventTypeLabel(event['type'])}
              </span>
            </div>
            {event.isRegistered && (
              <div className="absolute right-4 top-4">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  {lang === 'es' ? 'Registrado' : 'Registered'}
                </span>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="p-6">
            <h3 className="mb-2 font-heading text-lg font-semibold text-gray-900 dark:text-white">
              {event.title}
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {event['description']}
            </p>

            {/* Event Info */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <ClockIcon className="mr-2 h-4 w-4" />
                {formatEventDate(event.startDate, event.endDate)}
              </div>

              <div className="flex items-center">
                {event.location['type'] === 'virtual' ? (
                  <>
                    <VideoCameraIcon className="mr-2 h-4 w-4" />
                    {event.location.virtualPlatform || 'Online'}
                  </>
                ) : (
                  <>
                    <MapPinIcon className="mr-2 h-4 w-4" />
                    {event.location.venue || event.location.address}
                  </>
                )}
              </div>

              <div className="flex items-center">
                <UserGroupIcon className="mr-2 h-4 w-4" />
                {event.currentAttendees}/{event.maxAttendees}{' '}
                {lang === 'es' ? 'asistentes' : 'attendees'}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-4">
              {event.isRegistered ? (
                <a
                  href={`/${lang}/dashboard/events/${event['id']}`}
                  className="block w-full rounded-lg border border-primary-600 px-4 py-2 text-center text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20"
                >
                  {lang === 'es' ? 'Ver detalles' : 'View details'}
                </a>
              ) : (
                <a
                  href={`/${lang}/dashboard/events/${event['id']}`}
                  className="block w-full rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 px-4 py-2 text-center text-white transition-all hover:from-primary-600 hover:to-primary-700 hover:shadow-glow-sm"
                >
                  {lang === 'es' ? 'Registrarse' : 'Register'}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingEvents;
