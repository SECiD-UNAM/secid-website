import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ResourceDetail from '@/components/resources/ResourceDetail';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  resourceId?: string;
  lang?: 'es' | 'en';
}

export default function ResourceDetailPage({ resourceId, lang = 'es' }: Props) {
  const routeId = useRouteIdBySegment('resources');
  const effectiveId = resourceId || routeId || '';
  return (
    <AuthProvider>
      <ResourceDetail resourceId={effectiveId} />
    </AuthProvider>
  );
}
