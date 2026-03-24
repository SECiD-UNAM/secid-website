import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogList from '@/components/blog/BlogList';
import type { BlogPost } from '@/lib/blog';

interface Props {
  lang?: 'es' | 'en';
  initialPosts?: BlogPost[];
}

export default function BlogListPage({ lang = 'es', initialPosts = [] }: Props) {
  return (
    <AuthProvider>
      <BlogList lang={lang} initialPosts={initialPosts} />
    </AuthProvider>
  );
}
