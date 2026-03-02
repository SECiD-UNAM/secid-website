/**
 * Request authentication verification for API endpoints.
 * Defense-in-depth: endpoints should also be protected by middleware,
 * but this provides a second layer of protection.
 */

interface AuthResult {
  authenticated: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Verify that a request has a valid authentication token.
 * Extracts the session from the request (set by middleware) or
 * checks the Authorization header as a fallback.
 */
export function verifyRequest(request: Request): AuthResult {
  // Check if middleware already validated the session
  const session = (request as any).session;
  if (session?.userId) {
    return {
      authenticated: true,
      userId: session.userId,
    };
  }

  // Fallback: check for Authorization header presence
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authenticated: false,
      userId: null,
      error: 'Missing or invalid authorization header',
    };
  }

  // If we reach here, there's a Bearer token but no validated session.
  // This means the middleware didn't validate it (shouldn't happen for protected paths).
  return {
    authenticated: false,
    userId: null,
    error: 'Session not validated',
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
