import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import type { NewsletterIssue } from '@/lib/newsletter';

interface Props {
  lang?: 'es' | 'en';
  newsletterId?: string;
  newsletter?: NewsletterIssue;
}

export default function NewsletterFormPage({
  lang = 'es',
  newsletterId,
  newsletter,
}: Props) {
  return (
    <AuthProvider>
      <NewsletterForm
        lang={lang}
        newsletterId={newsletterId}
        newsletter={newsletter}
      />
    </AuthProvider>
  );
}
