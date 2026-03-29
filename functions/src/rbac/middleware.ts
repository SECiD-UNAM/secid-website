/**
 * Express-style RBAC middleware for Cloud Function HTTP endpoints.
 *
 * Layer 2 enforcement: checks permissions from Firebase Auth custom claims
 * on every incoming request. Uses the deny-first pattern — if a permission
 * is explicitly denied, the request is rejected before checking allows.
 *
 * This module depends only on the pure decode/check logic in resolution-logic.ts.
 * It has NO direct Firebase-admin dependency — it reads claims from `req.auth.token`
 * which is populated by Firebase's built-in auth middleware.
 */
import { decodeClaimsPermissions, checkPermission } from "./resolution-logic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RBACRequest {
  auth?: {
    token?: {
      rbac?: {
        g?: string[];
        p?: string;
      };
    };
  };
  rbacScope?: string;
}

interface RBACResponse {
  status(code: number): RBACResponse;
  json(body: unknown): RBACResponse;
}

type NextFunction = () => void;

// ---------------------------------------------------------------------------
// Middleware Factory
// ---------------------------------------------------------------------------

/**
 * Express middleware factory that checks RBAC permissions from custom claims.
 *
 * Usage:
 * ```ts
 * app.get('/api/events', requirePermission('events', 'view'), handler);
 * app.post('/api/events', requirePermission('events', 'create'), handler);
 * ```
 *
 * On success, sets `req.rbacScope` to 'own' or 'all' so downstream handlers
 * can enforce ownership checks when scope is 'own'.
 */
export function requirePermission(resource: string, operation: string) {
  return async (
    req: RBACRequest,
    res: RBACResponse,
    next: NextFunction,
  ): Promise<void> => {
    const permissionsString = req.auth?.token?.rbac?.p;

    if (!permissionsString) {
      res.status(403).json({ error: "No permissions assigned" });
      return;
    }

    const tokens = decodeClaimsPermissions(permissionsString);
    const result = checkPermission(tokens, resource, operation);

    if (result.denied) {
      res
        .status(403)
        .json({ error: `Permission denied: ${resource}:${operation}` });
      return;
    }

    if (!result.allowed) {
      res
        .status(403)
        .json({
          error: `Insufficient permissions for ${resource}:${operation}`,
        });
      return;
    }

    req.rbacScope = result.scope!;
    next();
  };
}
