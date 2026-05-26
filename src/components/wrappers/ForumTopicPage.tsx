import React, { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

// Lazy import keeps the excluded forums/* component out of the tsc graph
// while still bundling it at build time.
const ForumTopic = lazy(
  () => import('@/components/forums/ForumTopic') as any
);

interface Props {
  topicSlug?: string;
  language?: 'es' | 'en';
}

export default function ForumTopicPage({
  topicSlug,
  language = 'es',
}: Props) {
  const routeSlug = useRouteIdBySegment('topic');
  const effectiveSlug = topicSlug || routeSlug || '';
  if (!effectiveSlug) {
    if (typeof window !== 'undefined') {
      window.location.href = `/${language}/forum`;
    }
    return null;
  }
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <ForumTopic
          topicSlug={effectiveSlug}
          language={language}
          currentUser={undefined}
        />
      </Suspense>
    </AuthProvider>
  );
}
