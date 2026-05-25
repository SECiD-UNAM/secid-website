import React from 'react';
import { AdminMembersTable } from '@/components/dashboard/admin/AdminMembersTable';

interface Props {
  lang?: 'es' | 'en';
}

// DashboardShell (via DashboardLayout) already provides AuthProvider.
// A second AuthProvider here would create duplicate onSnapshot listeners on
// the same /users/{uid} doc, triggering Firestore SDK assertion failures
// (IDs b815/ca9) on concurrent target state — see issue #70.
export default function AdminMembersPage({ lang = 'es' }: Props) {
  return <AdminMembersTable lang={lang} />;
}
