import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import EventDetail from '@/components/events/EventDetail';

interface Props {
  eventId?: string;
  lang?: 'es' | 'en';
}

export default function EventDetailPage({ eventId, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <EventDetail eventId={eventId || ''} lang={lang} />
    </AuthProvider>
  );
}
