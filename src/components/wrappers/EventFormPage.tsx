import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { EventForm } from '@/components/events/EventForm';

interface Props {
  lang?: 'es' | 'en';
}

export default function EventFormPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <EventForm lang={lang} />
    </AuthProvider>
  );
}
