import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import GroupForm from '@/components/admin/GroupForm';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  lang?: 'es' | 'en';
  groupId?: string;
}

export default function GroupFormPage({ lang = 'es', groupId }: Props) {
  const routeId = useRouteIdBySegment('groups');
  const effectiveId = groupId || routeId;

  return (
    <AuthProvider>
      <GroupForm lang={lang} groupId={effectiveId ?? undefined} />
    </AuthProvider>
  );
}
