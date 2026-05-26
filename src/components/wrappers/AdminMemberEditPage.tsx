import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import ProfileEdit from '@/components/profile/ProfileEdit';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  lang?: 'es' | 'en';
  uid?: string;
}

export default function AdminMemberEditPage({ lang = 'es', uid }: Props) {
  // useRouteIdBySegment('members') already skips known non-ID segments
  // like 'edit'/'new'/'detail' so /dashboard/admin/members/{uid}/edit works.
  const routeUid = useRouteIdBySegment('members');
  const effectiveUid = uid || routeUid || '';
  if (!effectiveUid) return null;
  return (
    <AuthProvider>
      <ProfileEdit lang={lang} targetUid={effectiveUid} isAdmin={true} />
    </AuthProvider>
  );
}
