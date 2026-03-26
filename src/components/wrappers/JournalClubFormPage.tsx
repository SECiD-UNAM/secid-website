import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import JournalClubForm from '@/components/journal-club/JournalClubForm';
import { useRouteIdBySegment } from '@/hooks/use-route-id';
import type { JournalClubSession } from '@/lib/journal-club';

interface Props {
  lang?: 'es' | 'en';
  sessionId?: string;
  session?: JournalClubSession;
}

export default function JournalClubFormPage({
  lang = 'es',
  sessionId,
  session,
}: Props) {
  const routeId = useRouteIdBySegment('journal-club');
  const effectiveId = sessionId || routeId;

  return (
    <AuthProvider>
      <JournalClubForm
        lang={lang}
        sessionId={effectiveId ?? undefined}
        session={session}
      />
    </AuthProvider>
  );
}
