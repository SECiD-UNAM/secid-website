import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import BlogEditor from '@/components/blog/BlogEditor';

interface Props {
  lang?: 'es' | 'en';
}

export default function BlogEditorPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <BlogEditor lang={lang} />
    </AuthProvider>
  );
}
