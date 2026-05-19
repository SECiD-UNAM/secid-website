import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ResourceDetail from '@/components/resources/ResourceDetail';

interface Props {
  resourceId?: string;
  lang?: 'es' | 'en';
}

export default function ResourceDetailPage({ resourceId, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <ResourceDetail resourceId={resourceId || ''} />
    </AuthProvider>
  );
}
