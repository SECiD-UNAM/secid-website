import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MemberDirectory } from '@/components/directory/MemberDirectory';

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberDirectoryPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberDirectory lang={lang} showStats={true} />
    </AuthProvider>
  );
}
