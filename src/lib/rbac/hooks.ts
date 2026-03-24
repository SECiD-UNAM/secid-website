import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { decodePermissions } from './codec';
import { checkPermission } from './checker';
import type { Resource, Operation, Scope } from './types';
import type { ResolvedPermissions } from './codec';

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ResolvedPermissions | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    user
      .getIdTokenResult(true)
      .then((result) => {
        const rbac = result.claims.rbac as { p?: string } | undefined;
        if (rbac?.p) {
          setPermissions(decodePermissions(rbac.p));
        } else {
          setPermissions(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setPermissions(null);
        setLoading(false);
      });
  }, [user]);

  const can = useCallback(
    (
      resource: Resource,
      operation: Operation,
      requiredScope?: Scope
    ): boolean => {
      if (!permissions) return false;
      return checkPermission(permissions, resource, operation, requiredScope);
    },
    [permissions]
  );

  return { can, loading, permissions };
}
