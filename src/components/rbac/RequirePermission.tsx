import React from 'react';
import { usePermissions } from '@/lib/rbac/hooks';
import type { Resource, Operation, Scope } from '@/lib/rbac/types';
import AccessDenied from './AccessDenied';

interface RequirePermissionProps {
  resource: Resource;
  operation: Operation;
  scope?: Scope;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RequirePermission({
  resource,
  operation,
  scope,
  children,
  fallback,
}: RequirePermissionProps) {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!can(resource, operation, scope)) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
}
