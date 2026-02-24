import React, { useState, useEffect } from 'react';
import { useAuth} from '@/contexts/AuthContext';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp} from 'firebase/firestore';
import { db} from '@/lib/firebase';
import { BookmarkIcon as BookmarkSolidIcon} from '@heroicons/react/24/solid';
import EventRegistrationForm from './EventRegistrationForm';
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  VideoCameraIcon,
  BuildingOfficeIcon,
  ShareIcon,
  BookmarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TicketIcon,
  CurrencyDollarIcon,
  ArrowLeftIcon,
  LinkIcon,
  CalendarDaysIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

interface EventDetails {
  id: string;
  title: string;
  description: string;
  type: 'workshop' | 'networking' | 'career-fair' | 'webinar' | 'social' | 'conference';
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
    virtualPassword?: string;
  };
  registrationRequired: boolean;
  registrationDeadline?: Date;
  maxAttendees: number;
  currentAttendees: number;
  registrationFee: number;
  agenda?: Array<{
    time: string;
    title: string;
    speaker?: string;
    duration: number;
  }>;
  speakers?: Array<{
    name: string;
    title: string;
    company: string;
    bio: string;
    photoUrl?: string;
  }>;
  sponsors?: Array<{
    name: string;
    logo: string;
    level: 'gold' | 'silver' | 'bronze';
  }>;
  imageUrl?: string;
  tags: string[];
  organizers: string[];
  organizerDetails?: {
    name: string;
    email: string;
    phone?: string;
  };
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  featured: boolean;
  requirements?: string[];
  whatToBring?: string[];
  cancellationPolicy?: string;
}

interface Registration {
  userId: string;
  registeredAt: Date;
  attendanceStatus: 'registered' | 'attended' | 'no-show' | 'cancelled';
  checkedInAt?: Date;
}

interface EventDetailProps {
  eventId: string;
  lang?: 'es' | 'en';
}

export const EventDetail: React.FC<EventDetailProps> = ({ eventId, lang = 'es' }) => {
  const { user, userProfile } = useAuth();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [showVirtualDetails, setShowVirtualDetails] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  useEffect(() => {
    fetchEventDetails();
    if(user) {
      checkRegistrationStatus();
      checkSavedStatus();
    }
  }, [eventId, user]);

  const fetchEventDetails = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setEvent({
          id: eventDoc['id'],
          ...data,
          startDate: data['startDate']?.toDate() || new Date(),
          endDate: data?.endDate?.toDate() || new Date(),
          registrationDeadline: data['registrationDeadline']?.toDate(),
        } as EventDetails);
      } else {
        // Use mock data if event not found
        setEvent(getMockEventDetails());
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setEvent(getMockEventDetails());
    } finally {
      setLoading(false);
    }
  };

  const getMockEventDetails = (): EventDetails => ({
    id: eventId,
    title: 'Data Science Career Fair 2024',
    description: `Join us for the annual Data Science Career Fair, where top companies meet talented data science professionals and students. This is your opportunity to network with industry leaders, learn about job opportunities, and advance your career in data science.

This event brings together over 30 companies actively hiring data scientists, machine learning engineers, and data analysts. Whether you're a recent graduate or an experienced professional, you'll find valuable connections and opportunities.`,
    type: 'career-fair',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
    timezone: 'America/Mexico_City',
    duration: 240,
    location: {
      type: 'hybrid',
      venue: 'UNAM Campus Ciudad Universitaria',
      address: 'Avenida Universidad 3000, Coyoacán, 04510 Ciudad de México, CDMX',
      virtualLink: 'https://meet.google.com/xyz-abc-def',
      virtualPlatform: 'meet'
    },
    registrationRequired: true,
    registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    maxAttendees: 200,
    currentAttendees: 156,
    registrationFee: 0,
    agenda: [
      { time: '09:00', title: 'Registration & Welcome Coffee', duration: 60 },
      { time: '10:00', title: 'Opening Keynote', speaker: 'Dr. María González', duration: 45 },
      { time: '10:45', title: 'Company Booths Open', duration: 120 },
      { time: '12:45', title: 'Lunch Break', duration: 60 },
      { time: '13:45', title: 'Panel: Future of Data Science', speaker: 'Industry Leaders', duration: 60 },
      { time: '14:45', title: 'Networking Session', duration: 75 },
      { time: '16:00', title: 'Closing Remarks', speaker: 'SECiD President', duration: 30 }
    ],
    speakers: [
      {
        name: 'Dr. María González',
        title: 'Head of Data Science',
        company: 'Tech Corp México',
        bio: 'María has over 15 years of experience in data science and machine learning.',
        photoUrl: '/images/speaker1.jpg'
      },
      {
        name: 'Juan Carlos López',
        title: 'ML Engineering Manager',
        company: 'AI Startup',
        bio: 'Juan leads a team of 20+ ML engineers building production systems.',
        photoUrl: '/images/speaker2.jpg'
      }
    ],
    tags: ['career', 'networking', 'professional-development', 'hiring'],
    organizers: ['SECiD', 'UNAM Career Services'],
    organizerDetails: {
      name: 'SECiD Events Team',
      email: 'eventos@secid.mx',
      phone: '+52 55 1234 5678'
    },
    status: 'published',
    featured: true,
    requirements: [
      'Bring printed copies of your resume',
      'Professional attire recommended',
      'Register in advance to secure your spot'
    ],
    whatToBring: [
      'Business cards',
      'Portfolio or laptop to showcase projects',
      'Questions for recruiters'
    ],
    cancellationPolicy: 'Free cancellation up to 24 hours before the event'
  });

  const checkRegistrationStatus = async () => {
    if (!user) return;
    try {
      const registrationDoc = await getDoc(
        doc(db, 'events', eventId, 'registrations', user.uid)
      );
      
      if (registrationDoc.exists()) {
        setIsRegistered(true);
        setRegistration({
          ...registrationDoc.data(),
          registeredAt: registrationDoc['data']().registeredAt?.toDate(),
          checkedInAt: registrationDoc.data().checkedInAt?.toDate(),
        } as Registration);
      }
    } catch (error) {
      console.error('Error checking registration:', error);
    }
  };

  const checkSavedStatus = async () => {
    if (!user) return;
    try {
      const savedDoc = await getDoc(
        doc(db, 'users', user.uid, 'savedEvents', eventId)
      );
      setIsSaved(savedDoc.exists());
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleRegister = () => {
    if (!user) return;
    setShowRegistrationForm(true);
  };

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
    setShowRegistrationForm(false);
    // Reload the component to update registration status
    checkRegistrationStatus();
    fetchEventDetails();
  };

  const handleCancelRegistration = async () => {
    if (!user || !event) return;

    const confirmMessage = lang === 'es' 
      ? '¿Estás seguro de que quieres cancelar tu registro?' 
      : 'Are you sure you want to cancel your registration?';
    
    if (!confirm(confirmMessage)) return;

    setCancelling(true);
    try {
      // Delete registration
      await deleteDoc(doc(db, 'events', eventId, 'registrations', user.uid));

      // Update attendee count
      await updateDoc(doc(db, 'events', eventId), {
        currentAttendees: increment(-1)
      });

      // Remove from user's registered events
      await deleteDoc(doc(db, 'users', user.uid, 'registeredEvents', eventId));

      setIsRegistered(false);
      setRegistration(null);
      setEvent(prev => prev ? { ...prev, currentAttendees: prev.currentAttendees - 1 } : null);
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert(lang === 'es' ? 'Error al cancelar registro' : 'Error cancelling registration');
    } finally {
      setCancelling(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!user || !event) return;

    try {
      if(isSaved) {
        await deleteDoc(doc(db, 'users', user.uid, 'savedEvents', eventId));
      } else {
        await setDoc(doc(db, 'users', user.uid, 'savedEvents', eventId), {
          eventId,
          eventTitle: event.title,
          eventDate: event.startDate,
          savedAt: serverTimestamp()
        });
      }
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event?.title,
        text: `${event?.title} - ${event?.description.substring(0, 100)}...`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert(lang === 'es' ? 'Enlace copiado al portapapeles' : 'Link copied to clipboard');
    }
  };

  const addToCalendar = () => {
    if (!event) return;
    
    const startTime = event.startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endTime = event.endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const details = encodeURIComponent(event['description']);
    const location = encodeURIComponent(
      event.location['type'] === 'virtual' 
        ? event.location.virtualLink || 'Virtual Event'
        : `${event.location.venue}, ${event.location.address}`
    );
    
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, Record<string, string>> = {
      workshop: { es: 'Taller', en: 'Workshop' },
      networking: { es: 'Networking', en: 'Networking' },
      'career-fair': { es: 'Feria de empleo', en: 'Career Fair' },
      webinar: { es: 'Webinar', en: 'Webinar' },
      social: { es: 'Social', en: 'Social' },
      conference: { es: 'Conferencia', en: 'Conference' }
    };
    return labels[type]?.[lang] || type;
  };

  const isEventFull = event && event.maxAttendees > 0 && event.currentAttendees >= event.maxAttendees;
  const isRegistrationClosed = event?.registrationDeadline && new Date() > event.registrationDeadline;
  const isEventPast = event && new Date() > event.endDate;

  if(loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-8"></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {lang === 'es' ? 'Evento no encontrado' : 'Event not found'}
        </h2>
        <a
          href={`/${lang}/dashboard/events`}
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          {lang === 'es' ? '← Volver a eventos' : '← Back to events'}
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <a
        href={`/${lang}/dashboard/events`}
        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        {lang === 'es' ? 'Volver a eventos' : 'Back to events'}
      </a>

      {/* Event Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-6">
        {/* Event Image */}
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <CalendarIcon className="h-24 w-24 text-white opacity-50" />
          </div>
        )}

        <div className="p-8">
          {/* Event Status Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {event.featured && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                <SparklesIcon className="h-3 w-3 mr-1" />
                {lang === 'es' ? 'Destacado' : 'Featured'}
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400">
              {getEventTypeLabel(event['type'])}
            </span>
            {event['status'] === 'cancelled' && (
              <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                {lang === 'es' ? 'Cancelado' : 'Cancelled'}
              </span>
            )}
          </div>

          {/* Title and Actions */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Organizado por' : 'Organized by'} {event.organizers.join(', ')}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveEvent}
                className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                title={isSaved ? (lang === 'es' ? 'Guardado' : 'Saved') : (lang === 'es' ? 'Guardar' : 'Save')}
              >
                {isSaved ? (
                  <BookmarkSolidIcon className="h-6 w-6" />
                ) : (
                  <BookmarkIcon className="h-6 w-6" />
                )}
              </button>
              <button
                onClick={handleShare}
                className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                title={lang === 'es' ? 'Compartir' : 'Share'}
              >
                <ShareIcon className="h-6 w-6" />
              </button>
              <button
                onClick={addToCalendar}
                className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                title={lang === 'es' ? 'Agregar al calendario' : 'Add to calendar'}
              >
                <CalendarDaysIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Event Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                <CalendarIcon className="h-5 w-5 mr-2" />
                {lang === 'es' ? 'Fecha' : 'Date'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatDate(event.startDate)}
              </p>
            </div>

            <div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                <ClockIcon className="h-5 w-5 mr-2" />
                {lang === 'es' ? 'Hora' : 'Time'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatTime(event.startDate)} - {formatTime(event.endDate)}
              </p>
            </div>

            <div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                {event.location['type'] === 'virtual' ? (
                  <VideoCameraIcon className="h-5 w-5 mr-2" />
                ) : (
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                )}
                {lang === 'es' ? 'Ubicación' : 'Location'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {event.location['type'] === 'virtual' 
                  ? (lang === 'es' ? 'Evento Virtual' : 'Virtual Event')
                  : event.location.venue}
              </p>
            </div>

            <div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                {lang === 'es' ? 'Asistentes' : 'Attendees'}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {event.currentAttendees}/{event.maxAttendees || '∞'}
              </p>
            </div>
          </div>

          {/* Registration Button/Status */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            {isEventPast ? (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {lang === 'es' ? 'Este evento ya ha finalizado' : 'This event has ended'}
                </p>
              </div>
            ) : isRegistered ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 mr-2" />
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      {lang === 'es' ? 'Estás registrado para este evento' : 'You are registered for this event'}
                    </span>
                  </div>
                  <button
                    onClick={handleCancelRegistration}
                    disabled={cancelling}
                    className="text-red-600 dark:text-red-400 hover:underline text-sm font-medium"
                  >
                    {cancelling 
                      ? (lang === 'es' ? 'Cancelando...' : 'Cancelling...')
                      : (lang === 'es' ? 'Cancelar registro' : 'Cancel registration')}
                  </button>
                </div>
                
                {event.location['type'] !== 'physical' && (
                  <button
                    onClick={() => setShowVirtualDetails(!showVirtualDetails)}
                    className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {showVirtualDetails 
                      ? (lang === 'es' ? 'Ocultar detalles de acceso' : 'Hide access details')
                      : (lang === 'es' ? 'Ver detalles de acceso' : 'View access details')}
                  </button>
                )}
              </div>
            ) : isEventFull ? (
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-red-700 dark:text-red-300 font-medium">
                  {lang === 'es' ? 'Evento lleno' : 'Event full'}
                </p>
              </div>
            ) : isRegistrationClosed ? (
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {lang === 'es' ? 'El registro ha cerrado' : 'Registration closed'}
                </p>
              </div>
            ) : (
              <button
                onClick={handleRegister}
                disabled={!user}
                className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {!user 
                  ? (lang === 'es' ? 'Inicia sesión para registrarte' : 'Sign in to register')
                  : (lang === 'es' ? 'Registrarse para el evento' : 'Register for event')}
              </button>
            )}
          </div>

          {/* Virtual Event Details (shown when registered) */}
          {showVirtualDetails && event.location['type'] !== 'physical' && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                {lang === 'es' ? 'Detalles de acceso virtual' : 'Virtual access details'}
              </h3>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <div className="flex items-center">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  <a href={event.location.virtualLink} target="_blank" rel="noopener noreferrer" className="underline">
                    {event.location.virtualLink}
                  </a>
                </div>
                {event.location.virtualPassword && (
                  <div className="flex items-center">
                    <span className="mr-2">{lang === 'es' ? 'Contraseña:' : 'Password:'}</span>
                    <code className="px-2 py-1 bg-blue-100 dark:bg-blue-800 rounded">
                      {event.location.virtualPassword}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Acerca del evento' : 'About this event'}
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {event['description']}
              </p>
            </div>
          </div>

          {/* Agenda */}
          {event.agenda && event.agenda.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {lang === 'es' ? 'Agenda' : 'Agenda'}
              </h2>
              <div className="space-y-3">
                {event.agenda.map((item, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
                      {item.time}
                    </span>
                    <div className="flex-1 ml-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      {item.speaker && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.speaker}
                        </p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-500">
                      {item.duration} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {lang === 'es' ? 'Ponentes' : 'Speakers'}
              </h2>
              <div className="space-y-4">
                {event.speakers.map((speaker, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    {speaker.photoUrl ? (
                      <img
                        src={speaker.photoUrl}
                        alt={speaker['name']}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {speaker['name']}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {speaker.title} - {speaker.company}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                        {speaker.bio}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Requirements & What to Bring */}
          {(event.requirements || event.whatToBring) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {event.requirements && event.requirements.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {lang === 'es' ? 'Requisitos' : 'Requirements'}
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {event.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {event.whatToBring && event.whatToBring.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {lang === 'es' ? 'Qué traer' : 'What to bring'}
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {event.whatToBring.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {lang === 'es' ? 'Ubicación' : 'Location'}
            </h3>
            {event.location['type'] === 'virtual' ? (
              <div>
                <div className="flex items-center text-gray-700 dark:text-gray-300 mb-2">
                  <VideoCameraIcon className="h-5 w-5 mr-2" />
                  {lang === 'es' ? 'Evento Virtual' : 'Virtual Event'}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {lang === 'es' 
                    ? 'Los detalles de acceso se mostrarán después del registro'
                    : 'Access details will be shown after registration'}
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-start mb-4">
                  <MapPinIcon className="h-5 w-5 mr-2 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {event.location.venue}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.location.address}
                    </p>
                  </div>
                </div>
                {event.location['type'] === 'hybrid' && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center text-gray-700 dark:text-gray-300">
                      <VideoCameraIcon className="h-5 w-5 mr-2" />
                      {lang === 'es' ? 'También disponible virtual' : 'Also available virtually'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Organizer Contact */}
          {event.organizerDetails && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {lang === 'es' ? 'Contacto' : 'Contact'}
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {event.organizerDetails['name']}
                  </p>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  <a href={`mailto:${event.organizerDetails['email']}`} className="hover:underline">
                    {event.organizerDetails['email']}
                  </a>
                </div>
                {event.organizerDetails.phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    {event.organizerDetails.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {lang === 'es' ? 'Etiquetas' : 'Tags'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation Policy */}
          {event.cancellationPolicy && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {lang === 'es' ? 'Política de cancelación' : 'Cancellation policy'}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {event.cancellationPolicy}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Event Registration Form Modal */}
      <EventRegistrationForm 
        eventId={eventId}
        lang={lang}
        isOpen={showRegistrationForm}
        onClose={() => setShowRegistrationForm(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
};

export default EventDetail;