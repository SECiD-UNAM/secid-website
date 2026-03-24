import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightEditor from '@/components/spotlight/SpotlightEditor';

interface Props {
  lang?: 'es' | 'en';
}

export default function SpotlightEditorPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SpotlightEditor lang={lang} />
    </AuthProvider>
  );
}
