import React, { lazy, Suspense } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

// Lazy import keeps the excluded forums/* component out of the tsc graph
// while still bundling it at build time.
const ForumCategory = lazy(
  () => import('@/components/forums/ForumCategory') as any
);

interface Props {
  categorySlug?: string;
  language?: 'es' | 'en';
}

export default function ForumCategoryPage({
  categorySlug,
  language = 'es',
}: Props) {
  const routeSlug = useRouteIdBySegment('category');
  const effectiveSlug = categorySlug || routeSlug || '';
  if (!effectiveSlug) {
    if (typeof window !== 'undefined') {
      window.location.href = `/${language}/forum`;
    }
    return null;
  }
  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <ForumCategory
          categorySlug={effectiveSlug}
          language={language}
          currentUser={undefined}
        />
      </Suspense>
    </AuthProvider>
  );
}
