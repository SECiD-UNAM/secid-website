import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightEditor from '@/components/spotlight/SpotlightEditor';

interface Props {
  lang?: 'es' | 'en';
  spotlightId?: string;
}

export default function SpotlightEditorPage({ lang = 'es', spotlightId }: Props) {
  return (
    <AuthProvider>
      <SpotlightEditor lang={lang} spotlightId={spotlightId} />
    </AuthProvider>
  );
}
