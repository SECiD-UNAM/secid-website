import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import Analytics from '@/components/admin/Analytics';

export default function AdminAnalyticsPage() {
  return (
    <AuthProvider>
      <Analytics />
    </AuthProvider>
  );
}
