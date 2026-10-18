import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EventList } from '@/components/events/EventList';

interface Props {
  lang?: 'es' | 'en';
}

export default function EventListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <EventList lang={lang} />
    </AuthProvider>
  );
}
