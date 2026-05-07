import React from 'react';
import CalendarPage from '@/components/calendar/CalendarPage';

interface Props {
  lang?: 'es' | 'en';
}

export default function CalendarPageWrapper({ lang = 'es' }: Props) {
  return <CalendarPage lang={lang} />;
}
