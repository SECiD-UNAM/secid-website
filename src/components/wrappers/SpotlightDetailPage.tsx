import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightDetail from '@/components/spotlight/SpotlightDetail';

interface Props {
  spotlightId?: string;
  lang?: 'es' | 'en';
}

export default function SpotlightDetailPage({ spotlightId, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SpotlightDetail spotlightId={spotlightId || ''} lang={lang} />
    </AuthProvider>
  );
}
