import React, { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogPost from '@/components/blog/BlogPost';

interface Props {
  lang?: 'es' | 'en';
}

export default function BlogPostPage({ lang = 'es' }: Props) {
  const [slug] = useState(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  });

  return (
    <AuthProvider>
      <BlogPost slug={slug} lang={lang} />
    </AuthProvider>
  );
}
