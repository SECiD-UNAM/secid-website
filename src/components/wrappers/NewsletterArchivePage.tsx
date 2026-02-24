import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import NewsletterArchive from '@/components/newsletter/NewsletterArchive';

interface Props {
  lang?: 'es' | 'en';
}

export default function NewsletterArchivePage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <NewsletterArchive lang={lang} />
    </AuthProvider>
  );
}
