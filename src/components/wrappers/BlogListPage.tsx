import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogList from '@/components/blog/BlogList';

interface Props {
  lang?: 'es' | 'en';
}

export default function BlogListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <BlogList lang={lang} />
    </AuthProvider>
  );
}
