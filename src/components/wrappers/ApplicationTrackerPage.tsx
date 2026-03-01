import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ApplicationTracker from '@/components/jobs/ApplicationTracker';

interface Props {
  lang?: 'es' | 'en';
}

export default function ApplicationTrackerPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <ApplicationTracker lang={lang} />
    </AuthProvider>
  );
}
