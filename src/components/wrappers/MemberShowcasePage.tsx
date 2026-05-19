import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MemberShowcase } from '@/components/directory/MemberShowcase';

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberShowcasePage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberShowcase lang={lang} />
    </AuthProvider>
  );
}
