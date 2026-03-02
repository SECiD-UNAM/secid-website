import { sequence } from 'astro:middleware';
import { createEnvironmentSecurityMiddleware } from './security';
import { createSecurityManagerFromEnv } from '../lib/security-config';
import { createRateLimitMiddleware, KeyGenerators } from '../lib/rate-limiter';
import { createSessionMiddleware } from '../lib/session-manager';
import { createCaptchaMiddleware } from '../lib/captcha';

/**
 * Main middleware configuration for SECiD platform
 * Combines security, rate limiting, session management, and CAPTCHA protection
 */

import type { MiddlewareHandler } from 'astro';

// Initialize security manager
let securityManager: any = null;

try {
  securityManager = createSecurityManagerFromEnv();
} catch (error) {
  console.warn('Security manager initialization failed:', error);
  console.warn('Some security features may be disabled');
}

/**
 * Request logging middleware for development
 */
const loggingMiddleware: MiddlewareHandler = async (context, next) => {
  if ((process.env.NODE_ENV as string) === 'development') {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;

    console.log(
      `[${new Date().toISOString()}] ${context.request.method} ${context.url.pathname} - ${response['status']} (${duration}ms)`
    );

    return response;
  }

  return next();
};

/**
 * Error handling middleware
 */
const errorHandlingMiddleware: MiddlewareHandler = async (context, next) => {
  try {
    return await next();
  } catch (error) {
    console.error('Middleware error:', error);

    // Return a generic error response
    return new Response('Internal Server Error', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
};

/**
 * CORS middleware for API endpoints
 */
const corsMiddleware: MiddlewareHandler = async (context, next) => {
  // Only apply CORS to API endpoints
  if (context.url.pathname.startsWith('/api/')) {
    const response = await next();

    // Clone response to modify headers
    const newResponse = new Response(response.body, response);

    // Set CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', 'https://secid.mx');
    newResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    newResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    newResponse.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (context['request'].method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: newResponse.headers,
      });
    }

    return newResponse;
  }

  return next();
};

/**
 * Security headers middleware for static assets
 */
const assetSecurityMiddleware: MiddlewareHandler = async (context, next) => {
  const response = await next();

  // Apply cache control for static assets
  if (
    context.url.pathname.startsWith('/assets/') ||
    context.url.pathname.startsWith('/images/') ||
    context.url.pathname.match(
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
    )
  ) {
    const newResponse = new Response(response.body, response);

    // Set cache headers for static assets
    newResponse.headers.set(
      'Cache-Control',
      'public, max-age=31536000, immutable'
    );

    // Security headers for assets
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');

    return newResponse;
  }

  return response;
};

/**
 * Rate limiting middleware for API endpoints
 */
const rateLimitingMiddleware: MiddlewareHandler = async (context, next) => {
  if (!securityManager || !context.url.pathname.startsWith('/api/')) {
    return next();
  }

  const rateLimitMiddleware = createRateLimitMiddleware(
    securityManager.config.rateLimiting.presets.api,
    KeyGenerators.ip,
    securityManager.rateLimiter
  );

  const result = await rateLimitMiddleware(context.request);
  if (result) {
    return result; // Rate limit exceeded
  }

  return next();
};

/**
 * Session validation middleware
 */
const sessionValidationMiddleware: MiddlewareHandler = async (
  context,
  next
) => {
  if (!securityManager) {
    return next();
  }

  // Only validate sessions for protected endpoints
  const protectedPaths = ['/api/user/', '/api/admin/', '/dashboard', '/api/create-'];
  const needsSession = protectedPaths.some((path) =>
    context.url.pathname.startsWith(path)
  );

  if (!needsSession) {
    return next();
  }

  const sessionMiddleware = createSessionMiddleware(
    securityManager.sessionManager
  );
  const result = await sessionMiddleware(context.request);

  if (result) {
    return result; // Session validation failed
  }

  // Reject requests to protected paths that have no valid session token
  if (!(context.request as any).session) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer',
        },
      }
    );
  }

  return next();
};

/**
 * CAPTCHA validation middleware
 */
const captchaValidationMiddleware: MiddlewareHandler = async (
  context,
  next
) => {
  if (!securityManager || context['request'].method === 'GET') {
    return next();
  }

  // Only validate CAPTCHA for specific endpoints
  const captchaRequiredPaths = ['/api/auth/', '/api/contact', '/api/jobs'];
  const needsCaptcha = captchaRequiredPaths.some((path) =>
    context.url.pathname.startsWith(path)
  );

  if (!needsCaptcha) {
    return next();
  }

  const captchaMiddleware = createCaptchaMiddleware(
    securityManager.captchaManager,
    {
      requiredActions: ['login', 'register', 'contact', 'job-post'],
      getClientId: (request) =>
        request.headers.get('x-forwarded-for') || 'unknown',
      getAction: (request) => {
        const path = new URL(request.url).pathname;
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        if (path.includes('contact')) return 'contact';
        if (path.includes('jobs')) return 'job-post';
        return 'unknown';
      },
    }
  );

  const result = await captchaMiddleware(context['request']);
  if (result) {
    return result; // CAPTCHA validation failed
  }

  return next();
};

/**
 * Security logging middleware
 */
const securityLoggingMiddleware: MiddlewareHandler = async (context, next) => {
  const start = Date.now();

  try {
    const response = await next();

    // Log security events if security manager is available
    if (securityManager && response['status'] >= 400) {
      const duration = Date.now() - start;
      securityManager.logSecurityEvent('failure', 'request', {
        method: context['request'].method,
        path: context.url.pathname,
        status: response['status'],
        duration,
        userAgent: context['request'].headers['get']('user-agent'),
        ip: context['request'].headers['get']('x-forwarded-for'),
      });
    }

    // Add security headers to response
    if (securityManager && response['status'] < 400) {
      const securityHeaders = securityManager.getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response?.headers?.set(key, value);
      });
    }

    return response;
  } catch (error) {
    if (securityManager) {
      securityManager.logSecurityEvent('violation', 'middleware_error', {
        method: context['request'].method,
        path: context.url.pathname,
        error: error instanceof Error ? error['message'] : 'Unknown error',
        userAgent: context['request'].headers['get']('user-agent'),
        ip: context['request'].headers['get']('x-forwarded-for'),
      });
    }
    throw error;
  }
};

/**
 * Main middleware pipeline
 * Order matters: error handling first, then security, rate limiting, session validation,
 * CAPTCHA, CORS, assets, logging, and finally security logging
 */
export const onRequest = sequence(
  errorHandlingMiddleware,
  createEnvironmentSecurityMiddleware(),
  rateLimitingMiddleware,
  sessionValidationMiddleware,
  captchaValidationMiddleware,
  corsMiddleware,
  assetSecurityMiddleware,
  loggingMiddleware,
  securityLoggingMiddleware
);
