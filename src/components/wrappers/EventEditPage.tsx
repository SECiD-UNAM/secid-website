import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import EventForm from '@/components/events/EventForm';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  lang?: 'es' | 'en';
  eventId?: string;
}

export default function EventEditPage({ lang = 'es', eventId }: Props) {
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
      <EventForm lang={lang} eventId={effectiveId} />
    </AuthProvider>
  );
}
