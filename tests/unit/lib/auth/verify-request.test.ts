import { describe, it, expect } from 'vitest';
import {
  verifyRequest,
  unauthorizedResponse,
} from '@/lib/auth/verify-request';

describe('verifyRequest', () => {
  it('returns authenticated=true when request has a valid session set by middleware', () => {
    const request = new Request('https://secid.mx/api/create-payment-intent', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token-123' },
    });
    (request as any).session = { userId: 'user-abc-123' };

    const result = verifyRequest(request);

    expect(result.authenticated).toBe(true);
    expect(result.userId).toBe('user-abc-123');
    expect(result.error).toBeUndefined();
  });

  it('returns authenticated=false when no Authorization header is present', () => {
    const request = new Request('https://secid.mx/api/create-payment-intent', {
      method: 'POST',
    });

    const result = verifyRequest(request);

    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
    expect(result.error).toBe('Missing or invalid authorization header');
  });

  it('returns authenticated=false when Authorization header does not start with Bearer', () => {
    const request = new Request('https://secid.mx/api/create-payment-intent', {
      method: 'POST',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });

    const result = verifyRequest(request);

    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
    expect(result.error).toBe('Missing or invalid authorization header');
  });

  it('returns authenticated=false when Bearer token exists but no session was validated', () => {
    const request = new Request('https://secid.mx/api/create-payment-intent', {
      method: 'POST',
      headers: { Authorization: 'Bearer some-token-456' },
    });
    // No session set on request -- middleware did not validate the token

    const result = verifyRequest(request);

    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
    expect(result.error).toBe('Session not validated');
  });

  it('returns authenticated=false when session exists but has no userId', () => {
    const request = new Request('https://secid.mx/api/create-payment-intent', {
      method: 'POST',
      headers: { Authorization: 'Bearer some-token' },
    });
    (request as any).session = { userId: null };

    const result = verifyRequest(request);

    expect(result.authenticated).toBe(false);
    expect(result.userId).toBeNull();
    expect(result.error).toBe('Session not validated');
  });
});

describe('unauthorizedResponse', () => {
  it('returns a 401 response with correct headers and default message', async () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');

    const body = await response.json();
    expect(body.error).toBe('Authentication required');
  });

  it('returns a 401 response with a custom message', async () => {
    const response = unauthorizedResponse('Token expired');

    const body = await response.json();
    expect(body.error).toBe('Token expired');
  });
});
