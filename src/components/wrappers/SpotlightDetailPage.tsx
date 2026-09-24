import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightDetail from '@/components/spotlight/SpotlightDetail';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  spotlightId?: string;
  lang?: 'es' | 'en';
}

export default function SpotlightDetailPage({
  spotlightId,
  lang = 'es',
}: Props) {
  const routeId = useRouteIdBySegment('spotlights');
  const effectiveId = spotlightId || routeId || '';
  return (
    <AuthProvider>
      <SpotlightDetail spotlightId={effectiveId} lang={lang} />
    </AuthProvider>
  );
}
