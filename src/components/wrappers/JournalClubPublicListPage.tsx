import React from 'react';
import JournalClubPublicList from '@/components/journal-club/JournalClubPublicList';

interface Props {
  lang?: 'es' | 'en';
}

export default function JournalClubPublicListPage({ lang = 'es' }: Props) {
  return <JournalClubPublicList lang={lang} />;
}
