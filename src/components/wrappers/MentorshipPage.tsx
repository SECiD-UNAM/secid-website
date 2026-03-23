import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import MentorshipDashboard from '@/components/mentorship/MentorshipDashboard';

interface Props {
  lang?: 'es' | 'en';
}

export default function MentorshipPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MentorshipDashboard userRole="both" />
    </AuthProvider>
  );
}
