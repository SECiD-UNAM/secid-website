import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightList from '@/components/spotlight/SpotlightList';

interface Props {
  lang?: 'es' | 'en';
}

export default function SpotlightListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SpotlightList lang={lang} />
    </AuthProvider>
  );
}
