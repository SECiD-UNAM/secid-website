import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import JournalClubForm from '@/components/journal-club/JournalClubForm';
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
  return (
    <AuthProvider>
      <JournalClubForm lang={lang} sessionId={sessionId} session={session} />
    </AuthProvider>
  );
}
