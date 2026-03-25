import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import GroupDetail from '@/components/admin/GroupDetail';

interface Props {
  lang?: 'es' | 'en';
  groupId: string;
}

export default function GroupDetailPage({ lang = 'es', groupId }: Props) {
  return (
    <AuthProvider>
      <GroupDetail lang={lang} groupId={groupId} />
    </AuthProvider>
  );
}
