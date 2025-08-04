import { z } from 'zod';

/**
 * Enhanced session management system for SECiD platform
 * Implements secure session handling, timeout, concurrent session limiting,
 * and secure cookie management
 */

import type { User as FirebaseUser } from 'firebase/auth';

/**
 * Session configuration schema
 */
export const SessionConfigSchema = z.object({
  sessionTimeout: z.number().min(300000).max(86400000).default(3600000), // 1 hour default
  maxConcurrentSessions: z.number().min(1).max(10).default(3),
  enableSessionRotation: z.boolean().default(true),
  rotationInterval: z.number().min(900000).max(7200000).default(1800000), // 30 minutes
  enableDeviceTracking: z.boolean().default(true),
  requireReauthForSensitive: z.boolean().default(true),
  reauthTimeout: z.number().min(300000).max(3600000).default(900000), // 15 minutes
  cookieSecure: z.boolean().default(true),
  cookieSameSite: z.enum(['strict', 'lax', 'none']).default('strict'),
  cookieHttpOnly: z.boolean().default(true),
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>;

/**
 * Session data structure
 */
export interface SessionData {
  sessionId: string;
  userId: string;
  userRole: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
    location?: string;
  };
  isActive: boolean;
  requiresReauth: boolean;
  lastReauth?: number;
  metadata?: Record<string, any>;
}

/**
 * Session activity types
 */
export type SessionActivity =
  | 'login'
  | 'logout'
  | 'refresh'
  | 'reauth'
  | 'timeout'
  | 'concurrent_limit'
  | 'security_violation'
  | 'device_change';

/**
 * Session store interface
 */
export interface SessionStore {
  create(sessionData: SessionData): Promise<void>;
  get(sessionId: string): Promise<SessionData | null>;
  getByUserId(userId: string): Promise<SessionData[]>;
  update(sessionId: string, updates: Partial<SessionData>): Promise<void>;
  delete(sessionId: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
  logActivity(
    userId: string,
    sessionId: string,
    activity: SessionActivity,
    metadata?: any
  ): Promise<void>;
}

/**
 * In-memory session store (for development)
 */
export class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, SessionData>();
  private userSessions = new Map<string, Set<string>>();
  private activityLogs = new Map<string, any[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 300000) {
    // 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.deleteExpired();
    }, cleanupIntervalMs);
  }

  async create(sessionData: SessionData): Promise<void> {
    this.sessions.set(sessionData.sessionId, sessionData);

    if (!this.userSessions.has(sessionData.userId)) {
      this.userSessions.set(sessionData['userId'], new Set());
    }
    this.userSessions.get(sessionData.userId)!.add(sessionData.sessionId);
  }

  async get(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId) || null;
  }

  async getByUserId(userId: string): Promise<SessionData[]> {
    const userSessionIds = this.userSessions.get(userId) || new Set();
    const sessions: SessionData[] = [];

    for (const sessionId of userSessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async update(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<void> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.sessions.set(sessionId, { ...existing, ...updates });
    }
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      const userSessions = this.userSessions.get(session['userId']);
      if (userSessions) {
        userSessions.delete(sessionId);
        if (userSessions.size === 0) {
          this.userSessions.delete(session.userId);
        }
      }
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    const userSessionIds = this.userSessions.get(userId) || new Set();
    for (const sessionId of userSessionIds) {
      this.sessions.delete(sessionId);
    }
    this.userSessions.delete(userId);
  }

  async deleteExpired(): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt <= now || !session.isActive) {
        await this.delete(sessionId);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async logActivity(
    userId: string,
    sessionId: string,
    activity: SessionActivity,
    metadata?: any
  ): Promise<void> {
    if (!this.activityLogs.has(userId)) {
      this.activityLogs.set(userId, []);
    }

    this.activityLogs.get(userId)!.push({
      sessionId,
      activity,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last 100 activities per user
    const logs = this.activityLogs.get(userId)!;
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    this.userSessions.clear();
    this.activityLogs.clear();
  }
}

/**
 * Device fingerprinting utility
 */
export class DeviceFingerprinter {
  static generateDeviceId(userAgent: string, ipAddress: string): string {
    // Simple device ID generation - in production, use more sophisticated fingerprinting
    const hash = this.simpleHash(userAgent + ipAddress);
    return `device_${hash}`;
  }

  static parseUserAgent(userAgent: string): {
    browser: string;
    os: string;
    device: string;
  } {
    // Simplified user agent parsing - use a proper library in production
    const browserMatch = userAgent.match(
      /(Chrome|Firefox|Safari|Edge|Opera)\/?([\d.]+)/
    );
    const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)/);
    const mobileMatch = userAgent.match(/(Mobile|Tablet)/);

    return {
      browser: browserMatch
        ? `${browserMatch?.[1]} ${browserMatch?.[2]}`
        : 'Unknown',
      os: osMatch ? osMatch?.[1] : 'Unknown',
      device: mobileMatch ? mobileMatch?.[1] : 'Desktop',
    };
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Security validator for sessions
 */
export class SessionSecurityValidator {
  static validateSession(
    session: SessionData,
    request: Request
  ): {
    isValid: boolean;
    violations: string[];
    requiresReauth: boolean;
  } {
    const violations: string[] = [];
    let requiresReauth = false;

    const now = Date.now();
    const clientIP = this.getClientIP(request);
    const clientUserAgent = request.headers.get('user-agent') || '';

    // Check if session is expired
    if (session.expiresAt <= now) {
      violations.push('Session expired');
    }

    // Check if session is active
    if (!session.isActive) {
      violations.push('Session not active');
    }

    // Check IP address consistency (allow for some flexibility)
    if (session.ipAddress !== clientIP) {
      violations.push('IP address mismatch');
      requiresReauth = true;
    }

    // Check user agent consistency
    if (session.userAgent !== clientUserAgent) {
      violations.push('User agent mismatch');
      requiresReauth = true;
    }

    // Check for suspicious activity patterns
    const timeSinceLastActivity = now - session.lastActivity;
    if (timeSinceLastActivity > 7200000) {
      // 2 hours
      requiresReauth = true;
    }

    return {
      isValid: violations.length === 0,
      violations,
      requiresReauth: requiresReauth || session.requiresReauth,
    };
  }

  private static getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');

    return forwarded?.split(',')[0].trim() || realIP || remoteAddr || 'unknown';
  }
}

/**
 * Session manager class
 */
export class SessionManager {
  private store: SessionStore;
  private config: SessionConfig;

  constructor(store?: SessionStore, config?: Partial<SessionConfig>) {
    this.store = store || new MemorySessionStore();
    this.config = { ...SessionConfigSchema.parse({}), ...config };
  }

  /**
   * Create a new session
   */
  async createSession(
    user: FirebaseUser,
    request: Request,
    metadata?: Record<string, any>
  ): Promise<SessionData> {
    const now = Date.now();
    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    // Check concurrent session limit
    await this.enforceSessionLimits(user.uid);

    const sessionData: SessionData = {
      sessionId: this.generateSessionId(),
      userId: user.uid,
      userRole: (user as any).customClaims?.role || 'member',
      createdAt: now,
      lastActivity: now,
      expiresAt: now + this.config.sessionTimeout,
      ipAddress: clientIP,
      userAgent,
      deviceId: DeviceFingerprinter.generateDeviceId(userAgent, clientIP),
      deviceInfo: DeviceFingerprinter.parseUserAgent(userAgent),
      isActive: true,
      requiresReauth: false,
      metadata,
    };

    await this.store.create(sessionData);
    await this.store.logActivity(user.uid, sessionData.sessionId, 'login', {
      ipAddress: clientIP,
      userAgent,
      deviceInfo: sessionData.deviceInfo,
    });

    return sessionData;
  }

  /**
   * Validate and refresh a session
   */
  async validateSession(
    sessionId: string,
    request: Request
  ): Promise<{
    session: SessionData | null;
    isValid: boolean;
    violations: string[];
    requiresReauth: boolean;
  }> {
    const session = await this.store.get(sessionId);

    if (!session) {
      return {
        session: null,
        isValid: false,
        violations: ['Session not found'],
        requiresReauth: false,
      };
    }

    const validation = SessionSecurityValidator.validateSession(
      session,
      request
    );

    if (validation.isValid) {
      // Update last activity
      const now = Date.now();
      const updates: Partial<SessionData> = {
        lastActivity: now,
      };

      // Rotate session if needed
      if (this.config.enableSessionRotation) {
        const timeSinceCreated = now - session['createdAt'];
        if (timeSinceCreated > this.config.rotationInterval) {
          updates.expiresAt = now + this.config.sessionTimeout;
        }
      }

      await this.store.update(sessionId, updates);
    } else {
      // Log security violation
      await this.store.logActivity(
        session.userId,
        sessionId,
        'security_violation',
        { violations: validation.violations }
      );

      if (validation.violations.includes('Session expired')) {
        await this.store.delete(sessionId);
      }
    }

    return {
      session,
      isValid: validation.isValid,
      violations: validation.violations,
      requiresReauth: validation.requiresReauth,
    };
  }

  /**
   * Refresh session expiry
   */
  async refreshSession(sessionId: string): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }

    const now = Date.now();
    await this.store.update(sessionId, {
      lastActivity: now,
      expiresAt: now + this.config.sessionTimeout,
    });

    await this.store.logActivity(session.userId, sessionId, 'refresh');

    return true;
  }

  /**
   * Mark session as requiring reauth
   */
  async requireReauth(sessionId: string): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return false;
    }

    await this.store.update(sessionId, {
      requiresReauth: true,
    });

    return true;
  }

  /**
   * Clear reauth requirement after successful reauth
   */
  async clearReauthRequirement(sessionId: string): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return false;
    }

    await this.store.update(sessionId, {
      requiresReauth: false,
      lastReauth: Date.now(),
    });

    await this.store.logActivity(session.userId, sessionId, 'reauth');

    return true;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<boolean> {
    const session = await this.store.get(sessionId);
    if (!session) {
      return false;
    }

    await this.store.delete(sessionId);
    await this.store.logActivity(session.userId, sessionId, 'logout');

    return true;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.store.getByUserId(userId);

    for (const session of sessions) {
      await this.store.logActivity(userId, session.sessionId, 'logout', {
        reason: 'all_sessions_destroyed',
      });
    }

    await this.store.deleteByUserId(userId);
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions = await this.store.getByUserId(userId);
    const now = Date.now();

    return sessions.filter(
      (session) => session.isActive && session.expiresAt > now
    );
  }

  /**
   * Enforce concurrent session limits
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    if (sessions.length >= this.config.maxConcurrentSessions) {
      // Sort by last activity (oldest first)
      sessions.sort((a, b) => a.lastActivity - b.lastActivity);

      // Remove oldest sessions
      const sessionsToRemove = sessions.slice(
        0,
        sessions.length - this.config.maxConcurrentSessions + 1
      );

      for (const session of sessionsToRemove) {
        await this.store.delete(session.sessionId);
        await this.store.logActivity(
          userId,
          session.sessionId,
          'concurrent_limit'
        );
      }
    }
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(36))
      .join('');

    return `sess_${timestamp}_${randomBytes}`;
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
   * Create secure cookie options
   */
  createCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
  } {
    return {
      httpOnly: this.config.cookieHttpOnly,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      maxAge: this.config.sessionTimeout / 1000, // Convert to seconds
      path: '/',
    };
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return await this.store.deleteExpired();
  }

  /**
   * Get session configuration
   */
  getConfig(): SessionConfig {
    return { ...this.config };
  }

  /**
   * Update session configuration
   */
  updateConfig(updates: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Create session middleware
 */
export function createSessionMiddleware(sessionManager: SessionManager) {
  return async (request: Request): Promise<Response | null> => {
    const sessionId =
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      new URL(request.url).searchParams.get('session');

    if (!sessionId) {
      return null; // No session to validate
    }

    const validation = await sessionManager.validateSession(sessionId, request);

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid session',
          violations: validation.violations,
          requiresReauth: validation.requiresReauth,
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer',
          },
        }
      );
    }

    if (validation.requiresReauth) {
      return new Response(
        JSON.stringify({
          error: 'Reauthentication required',
          requiresReauth: true,
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Add session data to request for use in other middleware/handlers
    (request as any).session = validation.session;

    return null; // Allow request to continue
  };
}

export default SessionManager;
