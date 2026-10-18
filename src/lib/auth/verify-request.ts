/**
 * Request authentication verification for API endpoints.
 *
 * Identity comes ONLY from the session that the session-validation
 * middleware attached after validating it. The previous Bearer fallback
 * decoded the JWT *without verifying its RS256 signature*, so any caller
 * could forge a token with an arbitrary `sub` and be authenticated as
 * any user. That unsigned path is removed entirely.
 *
 * Note: with `output: 'static'` these API routes only execute under
 * `astro dev`, not in the GitHub Pages / Firebase Hosting prod build —
 * the real prod perimeter is Firestore/Storage rules + Cloud Functions.
 * Removing the forgeable path is still the correct hardening regardless
 * of deploy model.
 */

interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Verify that a request has a valid authentication context.
 * Trusts only the middleware-validated session — never an unverified
 * Bearer token.
 */
export function verifyRequest(request: Request): AuthResult {
  const session = (request as any).session;
  if (session?.userId) {
    return {
      authenticated: true,
      userId: session.userId,
    };
  }

  return {
    authenticated: false,
    userId: null,
    error: 'Authentication required',
  };
}

/**
 * Create a 401 Unauthorized response.
 */
export function unauthorizedResponse(
  message = 'Authentication required'
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer',
    },
  });
}
