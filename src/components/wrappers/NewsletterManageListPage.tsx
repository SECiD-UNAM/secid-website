import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import NewsletterManageList from '@/components/newsletter/NewsletterManageList';

interface Props {
  lang?: 'es' | 'en';
}

export default function NewsletterManageListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <NewsletterManageList lang={lang} />
    </AuthProvider>
  );
}
