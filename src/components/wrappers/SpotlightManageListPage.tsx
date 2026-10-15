import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightManageList from '@/components/spotlight/SpotlightManageList';

interface Props {
  lang?: 'es' | 'en';
}

export default function SpotlightManageListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SpotlightManageList lang={lang} />
    </AuthProvider>
  );
}
