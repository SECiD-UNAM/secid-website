import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import GroupList from '@/components/admin/GroupList';

interface Props {
  lang?: 'es' | 'en';
}

export default function GroupListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <GroupList lang={lang} />
    </AuthProvider>
  );
}
