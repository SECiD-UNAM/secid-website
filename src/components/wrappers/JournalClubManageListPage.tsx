import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import JournalClubManageList from '@/components/journal-club/JournalClubManageList';

interface Props {
  lang?: 'es' | 'en';
}

export default function JournalClubManageListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <JournalClubManageList lang={lang} />
    </AuthProvider>
  );
}
