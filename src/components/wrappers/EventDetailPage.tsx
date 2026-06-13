import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import EventDetail from '@/components/events/EventDetail';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  eventId?: string;
  lang?: 'es' | 'en';
}

export default function EventDetailPage({ eventId, lang = 'es' }: Props) {
  const routeId = useRouteIdBySegment('events');
  const effectiveId = eventId || routeId;

  if (!effectiveId) {
    return (
      <div className="py-8 text-center text-gray-500">
        {lang === 'es' ? 'Evento no encontrado' : 'Event not found'}
      </div>
    );
  }

  return (
    <AuthProvider>
      <EventDetail eventId={effectiveId} lang={lang} />
    </AuthProvider>
  );
}
