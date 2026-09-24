import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { JobBoard } from '@/components/jobs/JobBoard';

interface Props {
  lang?: 'es' | 'en';
}

export default function JobBoardPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <JobBoard lang={lang} />
    </AuthProvider>
  );
}
