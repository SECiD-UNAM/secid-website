import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import NewsletterView from '@/components/newsletter/NewsletterView';

interface Props {
  newsletterId?: string;
  lang?: 'es' | 'en';
}

export default function NewsletterViewPage({ newsletterId, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <NewsletterView newsletterId={newsletterId || ''} lang={lang} />
    </AuthProvider>
  );
}
