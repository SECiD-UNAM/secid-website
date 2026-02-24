// @ts-nocheck
import { SessionManager, MemorySessionStore } from './session-manager';
import {
  RateLimiter,
  MemoryRateLimitStore,
  RateLimitPresets,
} from './rate-limiter';
import { CaptchaManager, RecaptchaV3Provider } from './captcha';

/**
 * Security configuration and integration for SECiD platform
 * Centralizes all security settings and provides easy configuration
 */

import type { SessionConfig } from './session-manager';
import type { CaptchaConfig } from './captcha';

/**
 * Environment-specific security configurations
 */
export const SecurityEnvironments = {
  development: {
    session: {
      sessionTimeout: 3600000, // 1 hour
      maxConcurrentSessions: 5,
      enableSessionRotation: false,
      cookieSecure: false,
      cookieSameSite: 'lax' as const,
    },
    rateLimiting: {
      enabled: true,
      strictMode: false,
      presets: {
        api: { ...RateLimitPresets.api, maxRequests: 200 },
        auth: { ...RateLimitPresets.auth, maxRequests: 10 },
      },
    },
    captcha: {
      provider: 'recaptcha-v3' as const,
      threshold: 0.3,
      enabledForActions: ['register', 'contact'],
      failureAction: 'allow' as const,
    },
    logging: {
      level: 'debug',
      logFailedAttempts: true,
      logSuccessfulActions: false,
    },
  },

  staging: {
    session: {
      sessionTimeout: 3600000, // 1 hour
      maxConcurrentSessions: 3,
      enableSessionRotation: true,
      cookieSecure: true,
      cookieSameSite: 'strict' as const,
    },
    rateLimiting: {
      enabled: true,
      strictMode: true,
      presets: {
        api: RateLimitPresets.api,
        auth: RateLimitPresets.auth,
        registration: RateLimitPresets.registration,
      },
    },
    captcha: {
      provider: 'recaptcha-v3' as const,
      threshold: 0.5,
      enabledForActions: ['register', 'login', 'contact', 'job-post'],
      failureAction: 'block' as const,
    },
    logging: {
      level: 'info',
      logFailedAttempts: true,
      logSuccessfulActions: true,
    },
  },

  production: {
    session: {
      sessionTimeout: 3600000, // 1 hour
      maxConcurrentSessions: 3,
      enableSessionRotation: true,
      rotationInterval: 1800000, // 30 minutes
      cookieSecure: true,
      cookieSameSite: 'strict' as const,
      requireReauthForSensitive: true,
      reauthTimeout: 900000, // 15 minutes
    },
    rateLimiting: {
      enabled: true,
      strictMode: true,
      presets: {
        api: RateLimitPresets.api,
        auth: RateLimitPresets.auth,
        registration: RateLimitPresets.registration,
        contactForm: RateLimitPresets.contactForm,
        jobPosting: RateLimitPresets.jobPosting,
        search: RateLimitPresets.search,
        upload: RateLimitPresets.upload,
        ddos: RateLimitPresets.ddos,
      },
    },
    captcha: {
      provider: 'recaptcha-v3' as const,
      threshold: 0.7,
      enabledForActions: [
        'register',
        'login',
        'contact',
        'job-post',
        'password-reset',
        'profile-update',
        'event-register',
      ],
      failureAction: 'block' as const,
      retryLimit: 3,
    },
    logging: {
      level: 'warn',
      logFailedAttempts: true,
      logSuccessfulActions: false,
      enableAuditLog: true,
    },
  },
} as const;

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  environment: keyof typeof SecurityEnvironments;
  session: Partial<SessionConfig>;
  rateLimiting: {
    enabled: boolean;
    strictMode: boolean;
    presets: Record<string, any>;
  };
  captcha: Partial<CaptchaConfig>;
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logFailedAttempts: boolean;
    logSuccessfulActions: boolean;
    enableAuditLog?: boolean;
  };
  secrets: {
    sessionSecret: string;
    captchaSiteKey: string;
    captchaSecretKey: string;
    jwtSecret: string;
  };
}

/**
 * Security manager class
 */
export class SecurityManager {
  public sessionManager: SessionManager;
  public rateLimiter: RateLimiter;
  public captchaManager: CaptchaManager;
  private config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;

    // Initialize session manager
    this.sessionManager = new SessionManager(
      new MemorySessionStore(),
      config.session
    );

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      new MemoryRateLimitStore(),
      config?.captcha?.secretKey
        ? new RecaptchaV3Provider(config?.captcha?.secretKey)
        : undefined
    );

    // Initialize CAPTCHA manager
    if (config?.captcha?.siteKey && config?.captcha?.secretKey) {
      this.captchaManager = new CaptchaManager({
        provider: config?.captcha?.provider || 'recaptcha-v3',
        siteKey: config?.captcha?.siteKey,
        secretKey: config?.captcha?.secretKey,
        threshold: config?.captcha?.threshold || 0.5,
        enabledForActions: config?.captcha?.enabledForActions || [],
        failureAction: config?.captcha?.failureAction || 'block',
        retryLimit: config?.captcha?.retryLimit || 3,
        timeout: config?.captcha?.timeout || 10000,
      });
    } else {
      // In development mode, create a mock CAPTCHA manager
      const isDevelopment = (process.env.NODE_ENV as string) === 'development';
      if (isDevelopment) {
        console.warn(
          'CAPTCHA configuration missing - using mock CAPTCHA manager for development'
        );
        this.captchaManager = new CaptchaManager({
          provider: 'recaptcha-v3',
          siteKey: 'dev-mock-site-key',
          secretKey: 'dev-mock-secret-key',
          threshold: 0.5,
          enabledForActions: [],
          failureAction: 'allow',
          retryLimit: 3,
          timeout: 10000,
        });
      } else {
        throw new Error('CAPTCHA configuration is required in production');
      }
    }
  }

  /**
   * Get environment-specific configuration
   */
  static getEnvironmentConfig(
    environment: keyof typeof SecurityEnvironments = 'production'
  ): Partial<SecurityConfig> {
    return SecurityEnvironments[environment];
  }

  /**
   * Create security manager from environment
   */
  static fromEnvironment(
    environment: keyof typeof SecurityEnvironments = 'production',
    secrets: SecurityConfig['secrets']
  ): SecurityManager {
    const envConfig = SecurityManager.getEnvironmentConfig(environment);

    const config: SecurityConfig = {
      environment,
      session: envConfig.session,
      rateLimiting: envConfig.rateLimiting,
      captcha: {
        ...envConfig.captcha,
        siteKey: secrets.captchaSiteKey,
        secretKey: secrets.captchaSecretKey,
      },
      logging: envConfig.logging,
      secrets,
    };

    return new SecurityManager(config);
  }

  /**
   * Validate request security
   */
  async validateRequest(
    request: Request,
    options: {
      requireSession?: boolean;
      requireCaptcha?: boolean;
      action?: string;
      rateLimitKey?: string;
    } = {}
  ): Promise<{
    isValid: boolean;
    errors: string[];
    session?: any;
    rateLimitInfo?: any;
    captchaResult?: any;
  }> {
    const errors: string[] = [];
    let session: any = null;
    let rateLimitInfo: any = null;
    let captchaResult: any = null;

    // Session validation
    if (options.requireSession) {
      const sessionId = request.headers
        .get('authorization')
        ?.replace('Bearer ', '');
      if (sessionId) {
        const validation = await this.sessionManager.validateSession(
          sessionId,
          request
        );
        if (!validation.isValid) {
          errors.push(...validation.violations);
        } else {
          session = validation.session;
        }
      } else {
        errors.push('Session required');
      }
    }

    // Rate limiting
    if (this.config.rateLimiting.enabled) {
      const key = options.rateLimitKey || this.getClientIP(request);
      const preset = this.config.rateLimiting.presets[options.action || 'api'];

      if (preset) {
        const result = await this.rateLimiter.checkLimit(key, preset);
        rateLimitInfo = result;

        if (!result.allowed) {
          errors.push('Rate limit exceeded');
        }
      }
    }

    // CAPTCHA validation
    if (options.requireCaptcha && options.action) {
      const captchaToken = request.headers.get('x-captcha-token');

      if (captchaToken) {
        const result = await this.captchaManager.verify(
          captchaToken,
          options.action,
          this.getClientIP(request)
        );
        captchaResult = result;

        if (!result.success) {
          errors.push('CAPTCHA verification failed');
        }
      } else if (this.captchaManager.isEnabledForAction(options.action)) {
        errors.push('CAPTCHA required');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      session,
      rateLimitInfo,
      captchaResult,
    };
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: 'success' | 'failure' | 'violation',
    action: string,
    details: Record<string, any>
  ): void {
    const logLevel = this.config.logging.level;
    const shouldLog =
      (event === 'success' && this.config.logging.logSuccessfulActions) ||
      (event === 'failure' && this.config.logging.logFailedAttempts) ||
      event === 'violation';

    if (!shouldLog) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      action,
      environment: this.config.environment,
      ...details,
    };

    switch (logLevel) {
      case 'debug':
        console.debug('Security Event:', logEntry);
        break;
      case 'info':
        if (event === 'success') console.info('Security Event:', logEntry);
        break;
      case 'warn':
        if (event === 'failure' || event === 'violation') {
          console.warn('Security Event:', logEntry);
        }
        break;
      case 'error':
        if (event === 'violation') console.error('Security Event:', logEntry);
        break;
    }

    // Send to audit log if enabled
    if (this.config.logging.enableAuditLog) {
      this.sendToAuditLog(logEntry);
    }
  }

  /**
   * Get security headers for response
   */
  getSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Add rate limit headers if available
    if (this.config.rateLimiting.enabled) {
      headers['X-RateLimit-Policy'] = 'enabled';
    }

    // Add session info headers
    headers['X-Session-Timeout'] = (
      this.config.session.sessionTimeout || 3600000
    ).toString();

    // Add security policy headers
    headers['X-Security-Policy'] = this.config.environment;

    return headers;
  }

  /**
   * Cleanup expired sessions and rate limits
   */
  async cleanup(): Promise<{
    expiredSessions: number;
    rateLimitCleanup: boolean;
  }> {
    const expiredSessions = await this.sessionManager.cleanupExpiredSessions();
    await this.rateLimiter.cleanup();

    return {
      expiredSessions,
      rateLimitCleanup: true,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update component configurations
    if (updates.session) {
      this.sessionManager.updateConfig(updates.session);
    }

    if (updates.captcha) {
      this.captchaManager.updateConfig(updates.captcha as any);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    return forwarded?.split(',')[0].trim() || realIP || 'unknown';
  }

  /**
   * Send event to audit log (placeholder for external logging service)
   */
  private sendToAuditLog(logEntry: any): void {
    // Implementation would send to external logging service
    // e.g., Datadog, Splunk, CloudWatch, etc.
    console.log('Audit Log:', logEntry);
  }
}

/**
 * Create security manager from environment variables
 */
export function createSecurityManagerFromEnv(): SecurityManager {
  const environment =
    (process.env.NODE_ENV as string as keyof typeof SecurityEnvironments) ||
    'production';

  const secrets: SecurityConfig['secrets'] = {
    sessionSecret:
      process.env['SESSION_SECRET'] ||
      'dev-session-secret-change-in-production',
    captchaSiteKey: (process.env.RECAPTCHA_SITE_KEY as string) || '',
    captchaSecretKey: (process.env.RECAPTCHA_SECRET_KEY as string) || '',
    jwtSecret:
      (process.env.JWT_SECRET as string) ||
      'dev-jwt-secret-change-in-production',
  };

  // Validate required secrets in production
  if (environment === 'production') {
    const requiredSecrets = [
      'sessionSecret',
      'captchaSiteKey',
      'captchaSecretKey',
      'jwtSecret',
    ];
    const missingSecrets = requiredSecrets.filter(
      (key) => !secrets[key as keyof typeof secrets]
    );

    if (missingSecrets.length > 0) {
      throw new Error(
        `Missing required security secrets: ${missingSecrets.join(', ')}`
      );
    }
  }

  return SecurityManager.fromEnvironment(environment, secrets);
}

export default SecurityManager;
