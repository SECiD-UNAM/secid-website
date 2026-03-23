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
 * Decode a Firebase ID token payload without signature verification.
 * Returns null if the token is malformed or expired.
 */
function decodeAndValidateToken(
  token: string
): { uid: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encodedPayload = parts[1]!;
    const payload = JSON.parse(
      atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))
    );

    // Check required claims
    if (!payload.sub || typeof payload.sub !== 'string') return null;
    if (!payload.exp || typeof payload.exp !== 'number') return null;

    // Check expiry (with 30s leeway)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now - 30) return null;

    // Check issuer is Firebase
    if (
      !payload.iss ||
      !payload.iss.startsWith('https://securetoken.google.com/')
    )
      return null;

    return { uid: payload.sub, exp: payload.exp };
  } catch {
    return null;
  }
}

/**
 * Verify that a request has a valid authentication token.
 * Checks middleware session first, then falls back to Bearer token
 * decode + validation as defense-in-depth.
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

  // Fallback: decode and validate Bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      authenticated: false,
      userId: null,
      error: 'Missing or invalid authorization header',
    };
  }

  const token = authHeader.slice(7);
  const decoded = decodeAndValidateToken(token);

  if (!decoded) {
    return {
      authenticated: false,
      userId: null,
      error: 'Invalid or expired token',
    };
  }

  return {
    authenticated: true,
    userId: decoded.uid,
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
