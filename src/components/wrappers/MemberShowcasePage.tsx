import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import MemberInsights from '@/components/directory/MemberInsights';

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberShowcasePage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberInsights lang={lang} />
    </AuthProvider>
  );
}
