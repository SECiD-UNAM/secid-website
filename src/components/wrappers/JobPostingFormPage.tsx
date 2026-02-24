import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { JobPostingForm } from '@/components/jobs/JobPostingForm';

interface Props {
  lang?: 'es' | 'en';
}

export default function JobPostingFormPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <JobPostingForm lang={lang} />
    </AuthProvider>
  );
}
