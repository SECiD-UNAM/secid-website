import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import GroupDetail from '@/components/admin/GroupDetail';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  lang?: 'es' | 'en';
  groupId?: string;
}

export default function GroupDetailPage({ lang = 'es', groupId }: Props) {
  const routeId = useRouteIdBySegment('groups');
  const effectiveId = groupId || routeId;

  if (!effectiveId) {
    return (
      <div className="py-8 text-center text-gray-500">
        {lang === 'es' ? 'Grupo no encontrado' : 'Group not found'}
      </div>
    );
  }

  return (
    <AuthProvider>
      <GroupDetail lang={lang} groupId={effectiveId} />
    </AuthProvider>
  );
}
