import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import { useRouteIdBySegment } from '@/hooks/use-route-id';
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
  const routeId = useRouteIdBySegment('newsletter');
  const effectiveId = newsletterId || routeId;

  return (
    <AuthProvider>
      <NewsletterForm
        lang={lang}
        newsletterId={effectiveId ?? undefined}
        newsletter={newsletter}
      />
    </AuthProvider>
  );
}
