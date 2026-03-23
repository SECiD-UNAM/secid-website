import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogPost from '@/components/blog/BlogPost';

interface Props {
  slug?: string;
  lang?: 'es' | 'en';
}

export default function BlogPostPage({ slug, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <BlogPost slug={slug || ''} lang={lang} />
    </AuthProvider>
  );
}
