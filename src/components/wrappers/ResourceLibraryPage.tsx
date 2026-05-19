import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ResourceLibrary from '@/components/resources/ResourceLibrary';

interface Props {
  lang?: 'es' | 'en';
}

export default function ResourceLibraryPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <ResourceLibrary />
    </AuthProvider>
  );
}
