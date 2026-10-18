import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import MentorshipMatcher from '@/components/mentorship/MentorshipMatcher';

interface Props {
  lang?: 'es' | 'en';
}

export default function MentorBrowsePage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MentorshipMatcher />
    </AuthProvider>
  );
}
