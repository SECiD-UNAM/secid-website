import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SpotlightEditor from '@/components/spotlight/SpotlightEditor';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  lang?: 'es' | 'en';
  spotlightId?: string;
}

export default function SpotlightEditorPage({ lang = 'es', spotlightId }: Props) {
  const routeId = useRouteIdBySegment('spotlights');
  const effectiveId = spotlightId || routeId;

  return (
    <AuthProvider>
      <SpotlightEditor lang={lang} spotlightId={effectiveId ?? undefined} />
    </AuthProvider>
  );
}
