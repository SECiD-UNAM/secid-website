// @ts-nocheck
import { z } from 'zod';

/**
 * Rate limiting system for SECiD platform
 * Implements comprehensive rate limiting, DDoS protection, and CAPTCHA integration
 */

/**
 * Rate limit configuration schema
 */
export const RateLimitConfigSchema = z.object({
  windowMs: z.number().min(1000).max(3600000), // 1 second to 1 hour
  maxRequests: z.number().min(1).max(10000),
  keyGenerator: z.function().optional(),
  skipSuccessfulRequests: z.boolean().default(false),
  skipFailedRequests: z.boolean().default(false),
  enableCaptcha: z.boolean().default(false),
  captchaThreshold: z.number().min(1).default(5), // requests before CAPTCHA
  blockDuration: z.number().min(60000).default(300000), // 5 minutes default
  message: z.string().default('Too many requests'),
  statusCode: z.number().min(400).max(499).default(429),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

/**
 * Rate limit store interface
 */
export interface RateLimitStore {
  get(key: string): Promise<RateLimitData | null>;
  set(key: string, data: RateLimitData, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
  reset(key: string): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Rate limit data structure
 */
export interface RateLimitData {
  count: number;
  resetTime: number;
  blocked: boolean;
  blockUntil?: number;
  captchaRequired?: boolean;
  captchaCount?: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  captchaRequired: boolean;
  retryAfter?: number;
  message?: string;
}

/**
 * In-memory rate limit store (for development/small scale)
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitData>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 60000) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get(key: string): Promise<RateLimitData | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, data: RateLimitData, ttl: number): Promise<void> {
    this.store.set(key, data);

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.store.delete(key);
    }, ttl);
  }

  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.resetTime <= now) {
      // Create new or reset expired
      const newData: RateLimitData = {
        count: 1,
        resetTime: now + ttl,
        blocked: false,
      };
      this.store.set(key, newData);
      return 1;
    }

    // Increment existing
    existing.count++;
    this.store.set(key, existing);
    return existing.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, data] of this.store.entries()) {
      if (data.resetTime <= now && !data['blocked']) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

/**
 * Redis rate limit store (for production)
 */
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: any) {} // Redis client

  async get(key: string): Promise<RateLimitData | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, data: RateLimitData, ttl: number): Promise<void> {
    await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(data));
  }

  async increment(key: string, ttl: number): Promise<number> {
    const script = `
      local key = KEYS?.[1]
      local ttl = tonumber(ARGV?.[1])
      local now = tonumber(ARGV?.[2])
      
      local data = redis.call('GET', key)
      if not data then
        local newData = {
          count = 1,
          resetTime = now + ttl,
          blocked = false
        }
        redis.call('SETEX', key, math.ceil(ttl / 1000), cjson.encode(newData))
        return 1
      end
      
      local existing = cjson.decode(data)
      if existing.resetTime <= now and not existing.blocked then
        local newData = {
          count = 1,
          resetTime = now + ttl,
          blocked = false
        }
        redis.call('SETEX', key, math.ceil(ttl / 1000), cjson.encode(newData))
        return 1
      end
      
      existing.count = existing.count + 1
      redis.call('SETEX', key, math.ceil((existing.resetTime - now) / 1000), cjson.encode(existing))
      return existing.count
    `;

    return await this.redis.eval(script, 1, key, ttl, Date.now());
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL automatically, no manual cleanup needed
  }
}

/**
 * Default key generators
 */
export const KeyGenerators = {
  ip: (request: Request): string => {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : request.headers.get('x-real-ip') || 'unknown';
    return `ip:${ip}`;
  },

  user: (request: Request, userId?: string): string => {
    if (userId) return `user:${userId}`;
    return KeyGenerators.ip(request);
  },

  endpoint: (request: Request, endpoint?: string): string => {
    const path = endpoint || new URL(request.url).pathname;
    const ip = KeyGenerators.ip(request).split(':')[1];
    return `endpoint:${path}:${ip}`;
  },

  global: (): string => 'global',
};

/**
 * CAPTCHA provider interface
 */
export interface CaptchaProvider {
  verify(token: string, remoteIp?: string): Promise<boolean>;
}

/**
 * reCAPTCHA v3 provider
 */
export class RecaptchaV3Provider implements CaptchaProvider {
  constructor(
    private secretKey: string,
    private threshold = 0.5
  ) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (remoteIp) {
        params['append']('remoteip', remoteIp);
      }

      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          body: params,
        }
      );

      const data = await response.json();

      return (
        data.success &&
        data['score'] >= this.threshold &&
        data.action === 'form_submit'
      ); // Adjust action as needed
    } catch (error) {
      console.error('CAPTCHA verification error:', error);
      return false;
    }
  }
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private store: RateLimitStore;
  private captchaProvider?: CaptchaProvider;

  constructor(store?: RateLimitStore, captchaProvider?: CaptchaProvider) {
    this.store = store || new MemoryRateLimitStore();
    this.captchaProvider = captchaProvider;
  }

  /**
   * Check rate limit for a request
   */
  async checkLimit(
    key: string,
    config: RateLimitConfig,
    captchaToken?: string
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get current rate limit data
    let data = await this.store.get(key);

    // Initialize if not exists or window expired
    if (!data || data.resetTime <= now) {
      data = {
        count: 0,
        resetTime: now + config.windowMs,
        blocked: false,
      };
    }

    // Check if currently blocked
    if (data['blocked'] && data['blockUntil'] && data['blockUntil'] > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: data['blockUntil'],
        blocked: true,
        captchaRequired: false,
        retryAfter: Math.ceil((data['blockUntil'] - now) / 1000),
        message: 'Rate limit exceeded. Please try again later.',
      };
    }

    // If block period expired, reset
    if (data['blocked'] && data['blockUntil'] && data['blockUntil'] <= now) {
      data = {
        count: 0,
        resetTime: now + config.windowMs,
        blocked: false,
      };
    }

    // Increment request count
    data['count']++;

    // Check if CAPTCHA is enabled and required
    const captchaRequired =
      config.enableCaptcha && data.count >= config.captchaThreshold;

    if (captchaRequired) {
      data['captchaRequired'] = true;
      data['captchaCount'] = (data['captchaCount'] || 0) + 1;

      // Verify CAPTCHA if provided
      if (captchaToken && this.captchaProvider) {
        const captchaValid = await this.captchaProvider.verify(captchaToken);

        if (captchaValid) {
          // Reset count on successful CAPTCHA
          data.count = 0;
          data['captchaRequired'] = false;
          data['captchaCount'] = 0;
          await this.store.set(key, data, config.windowMs);

          return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: data['resetTime'],
            blocked: false,
            captchaRequired: false,
          };
        } else {
          // Invalid CAPTCHA - block immediately
          data['blocked'] = true;
          data['blockUntil'] = now + config.blockDuration;
          await this.store.set(key, data, config.blockDuration);

          return {
            allowed: false,
            remaining: 0,
            resetTime: data.blockUntil,
            blocked: true,
            captchaRequired: false,
            retryAfter: Math.ceil(config.blockDuration / 1000),
            message: 'Invalid CAPTCHA. Access blocked temporarily.',
          };
        }
      }

      // CAPTCHA required but not provided
      if (!captchaToken) {
        await this.store.set(key, data, config.windowMs);

        return {
          allowed: false,
          remaining: Math.max(0, config.maxRequests - data.count),
          resetTime: data['resetTime'],
          blocked: false,
          captchaRequired: true,
          message: 'CAPTCHA verification required.',
        };
      }
    }

    // Check if limit exceeded
    if (data['count'] > config.maxRequests) {
      data['blocked'] = true;
      data['blockUntil'] = now + config.blockDuration;
      await this.store.set(key, data, config.blockDuration);

      return {
        allowed: false,
        remaining: 0,
        resetTime: data['blockUntil'],
        blocked: true,
        captchaRequired: false,
        retryAfter: Math.ceil(config.blockDuration / 1000),
        message: config.message,
      };
    }

    // Save updated data
    await this.store.set(key, data, config.windowMs);

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - data['count']),
      resetTime: data['resetTime'],
      blocked: false,
      captchaRequired: false,
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string): Promise<void> {
    await this.store.reset(key);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(key: string): Promise<RateLimitData | null> {
    return await this.store.get(key);
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    await this.store.cleanup();
  }
}

/**
 * Pre-configured rate limit configurations
 */
export const RateLimitPresets = {
  // API endpoints
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    enableCaptcha: false,
    message: 'API rate limit exceeded',
  },

  // Authentication endpoints
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    enableCaptcha: true,
    captchaThreshold: 3,
    blockDuration: 900000, // 15 minutes
    message: 'Too many authentication attempts',
  },

  // Password reset
  passwordReset: {
    windowMs: 3600000, // 1 hour
    maxRequests: 3,
    enableCaptcha: true,
    captchaThreshold: 2,
    blockDuration: 3600000, // 1 hour
    message: 'Too many password reset attempts',
  },

  // Contact forms
  contactForm: {
    windowMs: 300000, // 5 minutes
    maxRequests: 2,
    enableCaptcha: true,
    captchaThreshold: 1,
    blockDuration: 300000,
    message: 'Please wait before submitting another message',
  },

  // Job posting
  jobPosting: {
    windowMs: 3600000, // 1 hour
    maxRequests: 5,
    enableCaptcha: true,
    captchaThreshold: 3,
    message: 'Too many job postings',
  },

  // User registration
  registration: {
    windowMs: 3600000, // 1 hour
    maxRequests: 3,
    enableCaptcha: true,
    captchaThreshold: 2,
    blockDuration: 3600000,
    message: 'Too many registration attempts',
  },

  // Search requests
  search: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    enableCaptcha: false,
    message: 'Search rate limit exceeded',
  },

  // File uploads
  upload: {
    windowMs: 300000, // 5 minutes
    maxRequests: 10,
    enableCaptcha: false,
    message: 'Upload rate limit exceeded',
  },

  // Global DDoS protection
  ddos: {
    windowMs: 10000, // 10 seconds
    maxRequests: 50,
    enableCaptcha: true,
    captchaThreshold: 30,
    blockDuration: 600000, // 10 minutes
    message: 'Too many requests detected',
  },
} as const;

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
  config: Partial<RateLimitConfig>,
  keyGenerator?: (request: Request) => string,
  rateLimiter?: RateLimiter
) {
  const limiter = rateLimiter || new RateLimiter();
  const fullConfig = { ...RateLimitPresets.api, ...config };
  const keyGen = keyGenerator || KeyGenerators.ip;

  return async (request: Request): Promise<Response | null> => {
    const key = keyGen(request);
    const captchaToken = request.headers.get('x-captcha-token') || undefined;

    try {
      const result = await limiter.checkLimit(key, fullConfig, captchaToken);

      if (!result.allowed) {
        const headers = new Headers({
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': fullConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': result?.remaining?.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        });

        if (result.retryAfter) {
          headers['set']('Retry-After', result?.retryAfter?.toString());
        }

        if (result.captchaRequired) {
          headers['set']('X-Captcha-Required', 'true');
        }

        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: result['message'],
            captchaRequired: result.captchaRequired,
            retryAfter: result.retryAfter,
          }),
          {
            status: fullConfig.statusCode,
            headers,
          }
        );
      }

      // Add rate limit headers to successful responses
      const headers = new Headers({
        'X-RateLimit-Limit': fullConfig.maxRequests.toString(),
        'X-RateLimit-Remaining': result?.remaining?.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      // Store headers for later use in the response
      (request as any).rateLimitHeaders = headers;

      return null; // Allow request to continue
    } catch (error) {
      console.error('Rate limiting error:', error);
      return null; // Allow request on error (fail open)
    }
  };
}

/**
 * Create global rate limiter instance
 */
export function createGlobalRateLimiter(
  storeType: 'memory' | 'redis' = 'memory',
  redisClient?: any,
  captchaSecretKey?: string
): RateLimiter {
  const store =
    storeType === 'redis' && redisClient
      ? new RedisRateLimitStore(redisClient)
      : new MemoryRateLimitStore();

  const captchaProvider = captchaSecretKey
    ? new RecaptchaV3Provider(captchaSecretKey)
    : undefined;

  return new RateLimiter(store, captchaProvider);
}

export default RateLimiter;
