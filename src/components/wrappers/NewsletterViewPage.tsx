import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import NewsletterView from '@/components/newsletter/NewsletterView';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  newsletterId?: string;
  lang?: 'es' | 'en';
}

export default function NewsletterViewPage({
  newsletterId,
  lang = 'es',
}: Props) {
  const routeId = useRouteIdBySegment('newsletter');
  const effectiveId = newsletterId || routeId || '';
  return (
    <AuthProvider>
      <NewsletterView newsletterId={effectiveId} lang={lang} />
    </AuthProvider>
  );
}
