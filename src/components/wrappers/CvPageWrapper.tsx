import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import CvPageClient from '@/components/cv/CvPageClient';

interface Props {
  lang?: 'es' | 'en';
}

export default function CvPageWrapper({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CvPageClient lang={lang} />
    </AuthProvider>
  );
}
