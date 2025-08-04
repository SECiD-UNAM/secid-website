/**
 * Security middleware for SECiD platform
 * Implements comprehensive security headers and policies
 */

import type { MiddlewareHandler } from 'astro';

interface SecurityConfig {
  csp: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
    workerSrc: string[];
    manifestSrc: string[];
    formAction: string[];
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameOptions: 'DENY' | 'SAMEORIGIN' | string;
  contentTypeOptions: boolean;
  referrerPolicy: string;
  permissionsPolicy: Record<string, string[]>;
}

const defaultSecurityConfig: SecurityConfig = {
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Needed for Astro hydration
      "'unsafe-eval'", // Needed for development
      'https://cdn.amplitude.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://www.googletagmanager.com',
      'https://analytics.google.com',
      'https://firebase.googleapis.com',
      'https://www.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://www.recaptcha.net',
      'https://recaptcha.net',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Needed for dynamic styles
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:',
      'https://firebasestorage.googleapis.com',
      'https://lh3.googleusercontent.com',
      'https://www.google.com',
      'https://analytics.google.com',
    ],
    connectSrc: [
      "'self'",
      'https://api.amplitude.com',
      'https://firebaseinstallations.googleapis.com',
      'https://firebase.googleapis.com',
      'https://www.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://firestore.googleapis.com',
      'https://analytics.google.com',
      'https://www.google-analytics.com',
      'wss://firebase.googleapis.com',
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'https://firebasestorage.googleapis.com'],
    frameSrc: [
      "'self'",
      'https://www.google.com',
      'https://recaptcha.net',
      'https://www.recaptcha.net',
    ],
    workerSrc: ["'self'", 'blob:'],
    manifestSrc: ["'self'"],
    formAction: ["'self'", 'https://docs.google.com'],
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'DENY',
  contentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: ["'none'"],
    microphone: ["'none'"],
    geolocation: ["'self'"],
    payment: ["'none'"],
    'display-capture': ["'none'"],
    fullscreen: ["'self'"],
    'web-share': ["'self'"],
  },
};

/**
 * Build Content Security Policy header value
 */
function buildCSPHeader(csp: SecurityConfig['csp']): string {
  const directives = Object.entries(csp).map(([directive, sources]) => {
    const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
    return `${kebabDirective} ${sources.join(' ')}`;
  });

  return directives.join('; ');
}

/**
 * Build Permissions Policy header value
 */
function buildPermissionsPolicyHeader(
  policy: SecurityConfig['permissionsPolicy']
): string {
  return Object.entries(policy)
    .map(([feature, allowlist]) => {
      const sources = allowlist
        .map((source) =>
          source === "'self'" || source === "'none'" ? source : `"${source}"`
        )
        .join(' ');
      return `${feature}=(${sources})`;
    })
    .join(', ');
}

/**
 * Security middleware factory
 */
export function createSecurityMiddleware(
  config: Partial<SecurityConfig> = {}
): MiddlewareHandler {
  const securityConfig = { ...defaultSecurityConfig, ...config };

  return async (context, next) => {
    const response = await next();

    // Only apply security headers to HTML responses
    const contentType = response?.headers?.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return response;
    }

    // Clone response to modify headers
    const newResponse = new Response(response.body, response);

    // Content Security Policy
    newResponse.headers.set(
      'Content-Security-Policy',
      buildCSPHeader(securityConfig.csp)
    );

    // HTTP Strict Transport Security
    if (context.url.protocol === 'https:') {
      const hstsValue = [
        `max-age=${securityConfig.hsts.maxAge}`,
        securityConfig.hsts.includeSubDomains ? 'includeSubDomains' : '',
        securityConfig.hsts.preload ? 'preload' : '',
      ]
        .filter(Boolean)
        .join('; ');

      newResponse.headers.set('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    newResponse.headers.set('X-Frame-Options', securityConfig.frameOptions);

    // X-Content-Type-Options
    if (securityConfig.contentTypeOptions) {
      newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (legacy, but still useful for older browsers)
    newResponse.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    newResponse.headers.set('Referrer-Policy', securityConfig.referrerPolicy);

    // Permissions Policy
    newResponse.headers.set(
      'Permissions-Policy',
      buildPermissionsPolicyHeader(securityConfig.permissionsPolicy)
    );

    // Cross-Origin Policies
    newResponse.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    newResponse.headers.set(
      'Cross-Origin-Opener-Policy',
      'same-origin-allow-popups'
    );
    newResponse.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    // Remove sensitive server information
    newResponse.headers.delete('Server');
    newResponse.headers.delete('X-Powered-By');

    return newResponse;
  };
}

/**
 * Development-specific security configuration
 */
export const developmentSecurityConfig: Partial<SecurityConfig> = {
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'", // Required for development
      'localhost:*',
      '127.0.0.1:*',
      'https://cdn.amplitude.com',
      'https://www.google.com',
      'https://www.gstatic.com',
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'localhost:*',
      '127.0.0.1:*',
      'https://fonts.googleapis.com',
    ],
    connectSrc: [
      "'self'",
      'localhost:*',
      '127.0.0.1:*',
      'ws://localhost:*',
      'ws://127.0.0.1:*',
      'https://api.amplitude.com',
      'https://firebase.googleapis.com',
    ],
    imgSrc: ["'self'", 'data:', 'localhost:*', '127.0.0.1:*', 'https:'],
    fontSrc: [
      "'self'",
      'localhost:*',
      '127.0.0.1:*',
      'https://fonts.gstatic.com',
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", 'localhost:*', '127.0.0.1:*'],
    frameSrc: ["'self'", 'localhost:*', '127.0.0.1:*'],
    workerSrc: ["'self'", 'blob:', 'localhost:*', '127.0.0.1:*'],
    manifestSrc: ["'self'", 'localhost:*', '127.0.0.1:*'],
    formAction: ["'self'", 'localhost:*', '127.0.0.1:*'],
  },
};

/**
 * Production-specific security configuration
 */
export const productionSecurityConfig: Partial<SecurityConfig> = {
  csp: {
    scriptSrc: [
      "'self'",
      'https://cdn.amplitude.com',
      'https://www.google.com',
      'https://www.gstatic.com',
      'https://www.googletagmanager.com',
      'https://analytics.google.com',
      'https://firebase.googleapis.com',
      'https://www.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://www.recaptcha.net',
    ],
  },
  hsts: {
    maxAge: 63072000, // 2 years for production
    includeSubDomains: true,
    preload: true,
  },
};

/**
 * Create environment-specific middleware
 */
export function createEnvironmentSecurityMiddleware(): MiddlewareHandler {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const config = isProduction
    ? productionSecurityConfig
    : developmentSecurityConfig;

  return createSecurityMiddleware(config);
}

export default createEnvironmentSecurityMiddleware();
