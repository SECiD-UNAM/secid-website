import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests that payment API endpoints reject unauthenticated requests.
 *
 * These tests import the actual endpoint handlers and verify they return
 * 401 when no valid session is attached to the request.
 */

// Mock the Stripe client to avoid real Stripe calls during tests
vi.mock('@/lib/stripe/stripe-client', () => ({
  createPaymentIntent: vi.fn(),
  createSubscription: vi.fn(),
  createCustomer: vi.fn(),
  createInvoice: vi.fn(),
  calculateMexicanTaxes: vi.fn(() => ({
    subtotal: 100,
    iva: 16,
    total: 116,
  })),
  validateRFC: vi.fn(() => true),
  SUBSCRIPTION_PLANS: {
    basic: { price: 100, name: 'Basic' },
    pro: { price: 200, name: 'Pro' },
  },
  stripe: {
    invoices: {
      retrieve: vi.fn(),
    },
  },
}));

describe('Payment endpoint authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create-payment-intent', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const { POST } = await import(
        '@/pages/api/create-payment-intent'
      );

      const request = new Request(
        'https://secid.mx/api/create-payment-intent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 1000 }),
        }
      );

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-payment-intent'),
      } as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('returns 401 when Authorization header is invalid (not Bearer)', async () => {
      const { POST } = await import(
        '@/pages/api/create-payment-intent'
      );

      const request = new Request(
        'https://secid.mx/api/create-payment-intent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Basic dXNlcjpwYXNz',
          },
          body: JSON.stringify({ amount: 1000 }),
        }
      );

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-payment-intent'),
      } as any);

      expect(response.status).toBe(401);
    });

    it('does not return 401 when valid session is present on request', async () => {
      const { POST } = await import(
        '@/pages/api/create-payment-intent'
      );

      const request = new Request(
        'https://secid.mx/api/create-payment-intent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
          body: JSON.stringify({ amount: 1000 }),
        }
      );
      (request as any).session = { userId: 'user-123' };

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-payment-intent'),
      } as any);

      // Auth guard passes -- response may be 200 or 500 depending on Stripe mock,
      // but it must NOT be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('create-subscription', () => {
    it('returns 401 when no Authorization header is provided', async () => {
      const { POST } = await import('@/pages/api/create-subscription');

      const request = new Request(
        'https://secid.mx/api/create-subscription',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: 'basic', customerId: 'cus_123' }),
        }
      );

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-subscription'),
      } as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('returns 401 when Authorization header is invalid', async () => {
      const { POST } = await import('@/pages/api/create-subscription');

      const request = new Request(
        'https://secid.mx/api/create-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Token abc',
          },
          body: JSON.stringify({ planId: 'basic', customerId: 'cus_123' }),
        }
      );

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-subscription'),
      } as any);

      expect(response.status).toBe(401);
    });

    it('does not return 401 when valid session is present on request', async () => {
      const { POST } = await import('@/pages/api/create-subscription');

      const request = new Request(
        'https://secid.mx/api/create-subscription',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          },
          body: JSON.stringify({ planId: 'pro', customerId: 'cus_123' }),
        }
      );
      (request as any).session = { userId: 'user-456' };

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-subscription'),
      } as any);

      // Auth guard passes -- response may vary depending on Stripe mock,
      // but it must NOT be 401
      expect(response.status).not.toBe(401);
    });
  });

  describe('create-invoice', () => {
    it('returns 401 on POST when no Authorization header is provided', async () => {
      const { POST } = await import('@/pages/api/create-invoice');

      const request = new Request('https://secid.mx/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cus_123',
          amount: 500,
          description: 'Test invoice',
        }),
      });

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-invoice'),
      } as any);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Authentication required');
    });

    it('returns 401 on GET when no Authorization header is provided', async () => {
      const { GET } = await import('@/pages/api/create-invoice');

      const request = new Request(
        'https://secid.mx/api/create-invoice?id=inv_123',
        { method: 'GET' }
      );

      const response = await GET({
        request,
        url: new URL('https://secid.mx/api/create-invoice?id=inv_123'),
      } as any);

      expect(response.status).toBe(401);
    });

    it('does not return 401 on POST when valid session is present', async () => {
      const { POST } = await import('@/pages/api/create-invoice');

      const request = new Request('https://secid.mx/api/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          customerId: 'cus_123',
          amount: 500,
          description: 'Test invoice',
        }),
      });
      (request as any).session = { userId: 'user-789' };

      const response = await POST({
        request,
        url: new URL('https://secid.mx/api/create-invoice'),
      } as any);

      // Auth guard passes -- response may vary depending on Stripe mock,
      // but it must NOT be 401
      expect(response.status).not.toBe(401);
    });
  });
});
