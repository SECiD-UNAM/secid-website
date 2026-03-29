import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogPost from '@/components/blog/BlogPost';
import type { BlogPost as BlogPostType } from '@/lib/blog';

interface Props {
  slug?: string;
  lang?: 'es' | 'en';
  initialPost?: BlogPostType | null;
}

export default function BlogPostPage({ slug, lang = 'es', initialPost = null }: Props) {
  return (
    <AuthProvider>
      <BlogPost slug={slug || ''} lang={lang} initialPost={initialPost} />
    </AuthProvider>
  );
}
