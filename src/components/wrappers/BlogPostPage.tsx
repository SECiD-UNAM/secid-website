import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogPost from '@/components/blog/BlogPost';
import type { BlogPost as BlogPostType } from '@/lib/blog';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  slug?: string;
  lang?: 'es' | 'en';
  initialPost?: BlogPostType | null;
}

export default function BlogPostPage({
  slug,
  lang = 'es',
  initialPost = null,
}: Props) {
  const routeSlug = useRouteIdBySegment('blog');
  const effectiveSlug = slug || routeSlug || '';
  return (
    <AuthProvider>
      <BlogPost slug={effectiveSlug} lang={lang} initialPost={initialPost} />
    </AuthProvider>
  );
}
