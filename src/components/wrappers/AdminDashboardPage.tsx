import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminDashboardPage() {
  return (
    <AuthProvider>
      <AdminDashboard />
    </AuthProvider>
  );
}
