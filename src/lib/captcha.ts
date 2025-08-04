import { z } from 'zod';

/**
 * CAPTCHA integration system for SECiD platform
 * Supports multiple CAPTCHA providers and provides unified interface
 */

/**
 * CAPTCHA configuration schema
 */
export const CaptchaConfigSchema = z.object({
  provider: z.enum(['recaptcha-v2', 'recaptcha-v3', 'hcaptcha', 'turnstile']),
  siteKey: z.string().min(1),
  secretKey: z.string().min(1),
  threshold: z.number().min(0).max(1).default(0.5), // For v3 and score-based
  timeout: z.number().min(1000).max(30000).default(10000),
  enabledForActions: z
    .array(z.string())
    .default(['login', 'register', 'contact', 'job-post']),
  failureAction: z.enum(['block', 'fallback', 'allow']).default('block'),
  retryLimit: z.number().min(1).max(10).default(3),
});

export type CaptchaConfig = z.infer<typeof CaptchaConfigSchema>;

/**
 * CAPTCHA verification result
 */
export interface CaptchaVerificationResult {
  success: boolean;
  score?: number; // For reCAPTCHA v3 and similar
  action?: string;
  hostname?: string;
  challengeTs?: string;
  errorCodes?: string[];
  metadata?: Record<string, any>;
}

/**
 * CAPTCHA provider interface
 */
export interface CaptchaProvider {
  verify(
    token: string,
    remoteIp?: string,
    action?: string
  ): Promise<CaptchaVerificationResult>;
  getClientScript(): string;
  renderWidget(containerId: string, options?: any): string;
}

/**
 * reCAPTCHA v2 provider
 */
export class RecaptchaV2Provider implements CaptchaProvider {
  constructor(
    private siteKey: string,
    private secretKey: string,
    private config: Partial<CaptchaConfig> = {}
  ) {}

  async verify(
    token: string,
    remoteIp?: string
  ): Promise<CaptchaVerificationResult> {
    try {
      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (remoteIp) {
        params['append']('remoteip', remoteIp);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || 10000
      );

      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: data['success'] === true,
        hostname: data['hostname'],
        challengeTs: data['challenge_ts'],
        errorCodes: data['error-codes'] || [],
        metadata: {
          provider: 'recaptcha-v2',
          raw: data,
        },
      };
    } catch (error) {
      console.error('reCAPTCHA v2 verification error:', error);
      return {
        success: false,
        errorCodes: ['network-error'],
        metadata: {
          provider: 'recaptcha-v2',
          error: error instanceof Error ? error['message'] : 'Unknown error',
        },
      };
    }
  }

  getClientScript(): string {
    return 'https://www.google.com/recaptcha/api.js';
  }

  renderWidget(containerId: string, options: any = {}): string {
    const config = {
      sitekey: this.siteKey,
      theme: 'light',
      size: 'normal',
      ...options,
    };

    return `
      <div id="${containerId}"></div>
      <script>
        function render${containerId}Captcha() {
          if (typeof grecaptcha !== 'undefined') {
            grecaptcha.render('${containerId}', ${JSON.stringify(config)});
          }
        }
        
        if (typeof grecaptcha !== 'undefined') {
          render${containerId}Captcha();
        } else {
          document['addEventListener']('DOMContentLoaded', function() {
            if (window.grecaptcha) {
              render${containerId}Captcha();
            } else {
              window.onRecaptchaLoad = render${containerId}Captcha;
            }
          });
        }
      </script>
    `;
  }
}

/**
 * reCAPTCHA v3 provider
 */
export class RecaptchaV3Provider implements CaptchaProvider {
  constructor(
    private siteKey: string,
    private secretKey: string,
    private config: Partial<CaptchaConfig> = {}
  ) {}

  async verify(
    token: string,
    remoteIp?: string,
    action?: string
  ): Promise<CaptchaVerificationResult> {
    try {
      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (remoteIp) {
        params['append']('remoteip', remoteIp);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || 10000
      );

      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const threshold = this.config.threshold || 0.5;

      return {
        success:
          data['success'] === true &&
          data['score'] >= threshold &&
          (!action || data['action'] === action),
        score: data['score'],
        action: data['action'],
        hostname: data['hostname'],
        challengeTs: data['challenge_ts'],
        errorCodes: data['error-codes'] || [],
        metadata: {
          provider: 'recaptcha-v3',
          threshold,
          raw: data,
        },
      };
    } catch (error) {
      console.error('reCAPTCHA v3 verification error:', error);
      return {
        success: false,
        errorCodes: ['network-error'],
        metadata: {
          provider: 'recaptcha-v3',
          error: error instanceof Error ? error['message'] : 'Unknown error',
        },
      };
    }
  }

  getClientScript(): string {
    return `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
  }

  renderWidget(containerId: string, options: any = {}): string {
    const action = options.action || 'submit';

    return `
      <div id="${containerId}"></div>
      <script>
        function execute${containerId}Captcha() {
          if (typeof grecaptcha !== 'undefined') {
            grecaptcha.ready(function() {
              grecaptcha.execute('${this.siteKey}', {action: '${action}'}).then(function(token) {
                const input = document.getElementById('${containerId}-token') || 
                             document['createElement']('input');
                input['type'] = 'hidden';
                input['name'] = 'captcha-token';
                input.id = '${containerId}-token';
                input.value = token;
                
                const container = document.getElementById('${containerId}');
                if (container && !document['getElementById']('${containerId}-token')) {
                  container.appendChild(input);
                }
                
                // Trigger custom event
                const event = new CustomEvent('captchaTokenReceived', {
                  detail: { token: token, containerId: '${containerId}' }
                });
                document['dispatchEvent'](event);
              });
            });
          }
        }
        
        if (typeof grecaptcha !== 'undefined') {
          execute${containerId}Captcha();
        } else {
          document['addEventListener']('DOMContentLoaded', execute${containerId}Captcha);
        }
      </script>
    `;
  }
}

/**
 * hCaptcha provider
 */
export class HCaptchaProvider implements CaptchaProvider {
  constructor(
    private siteKey: string,
    private secretKey: string,
    private config: Partial<CaptchaConfig> = {}
  ) {}

  async verify(
    token: string,
    remoteIp?: string
  ): Promise<CaptchaVerificationResult> {
    try {
      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (remoteIp) {
        params['append']('remoteip', remoteIp);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || 10000
      );

      const response = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: data['success'] === true,
        hostname: data['hostname'],
        challengeTs: data['challenge_ts'],
        errorCodes: data['error-codes'] || [],
        metadata: {
          provider: 'hcaptcha',
          raw: data,
        },
      };
    } catch (error) {
      console.error('hCaptcha verification error:', error);
      return {
        success: false,
        errorCodes: ['network-error'],
        metadata: {
          provider: 'hcaptcha',
          error: error instanceof Error ? error['message'] : 'Unknown error',
        },
      };
    }
  }

  getClientScript(): string {
    return 'https://hcaptcha.com/1/api.js';
  }

  renderWidget(containerId: string, options: any = {}): string {
    const config = {
      'data-sitekey': this.siteKey,
      'data-theme': 'light',
      'data-size': 'normal',
      ...options,
    };

    const attributes = Object.entries(config)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    return `
      <div id="${containerId}" class="h-captcha" ${attributes}></div>
      <script>
        if (typeof hcaptcha !== 'undefined') {
          hcaptcha.render('${containerId}');
        }
      </script>
    `;
  }
}

/**
 * Cloudflare Turnstile provider
 */
export class TurnstileProvider implements CaptchaProvider {
  constructor(
    private siteKey: string,
    private secretKey: string,
    private config: Partial<CaptchaConfig> = {}
  ) {}

  async verify(
    token: string,
    remoteIp?: string
  ): Promise<CaptchaVerificationResult> {
    try {
      const params = new URLSearchParams({
        secret: this.secretKey,
        response: token,
      });

      if (remoteIp) {
        params['append']('remoteip', remoteIp);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || 10000
      );

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: params,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: data['success'] === true,
        hostname: data['hostname'],
        challengeTs: data['challenge_ts'],
        errorCodes: data['error-codes'] || [],
        metadata: {
          provider: 'turnstile',
          raw: data,
        },
      };
    } catch (error) {
      console.error('Turnstile verification error:', error);
      return {
        success: false,
        errorCodes: ['network-error'],
        metadata: {
          provider: 'turnstile',
          error: error instanceof Error ? error['message'] : 'Unknown error',
        },
      };
    }
  }

  getClientScript(): string {
    return 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  }

  renderWidget(containerId: string, options: any = {}): string {
    const config = {
      'data-sitekey': this.siteKey,
      'data-theme': 'light',
      'data-size': 'normal',
      ...options,
    };

    const attributes = Object.entries(config)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    return `
      <div id="${containerId}" class="cf-turnstile" ${attributes}></div>
      <script>
        if (typeof turnstile !== 'undefined') {
          turnstile.render('#${containerId}');
        }
      </script>
    `;
  }
}

/**
 * CAPTCHA manager class
 */
export class CaptchaManager {
  private provider: CaptchaProvider;
  private config: CaptchaConfig;
  private retryCount = new Map<string, number>();

  constructor(config: CaptchaConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  /**
   * Verify CAPTCHA token
   */
  async verify(
    token: string,
    action?: string,
    remoteIp?: string,
    clientId?: string
  ): Promise<CaptchaVerificationResult> {
    // Check retry limit
    if (clientId && this.hasExceededRetryLimit(clientId)) {
      return {
        success: false,
        errorCodes: ['retry-limit-exceeded'],
        metadata: {
          retryCount: this.getRetryCount(clientId),
          maxRetries: this.config.retryLimit,
        },
      };
    }

    // Verify action is enabled
    if (action && !this.config.enabledForActions.includes(action)) {
      return {
        success: false,
        errorCodes: ['action-not-enabled'],
        metadata: {
          action,
          enabledActions: this.config.enabledForActions,
        },
      };
    }

    try {
      const result = await this.provider.verify(token, remoteIp, action);

      // Handle verification result
      if (result.success) {
        // Reset retry count on success
        if (clientId) {
          this.retryCount.delete(clientId);
        }
      } else {
        // Increment retry count on failure
        if (clientId) {
          this.incrementRetryCount(clientId);
        }

        // Handle failure action
        if (this.config.failureAction === 'fallback') {
          // Implement fallback mechanism (e.g., additional verification)
          result.metadata = {
            ...result['metadata'],
            fallbackRequired: true,
          };
        }
      }

      return result;
    } catch (error) {
      console.error('CAPTCHA verification error:', error);

      if (clientId) {
        this.incrementRetryCount(clientId);
      }

      return {
        success: false,
        errorCodes: ['verification-error'],
        metadata: {
          error: error instanceof Error ? error['message'] : 'Unknown error',
        },
      };
    }
  }

  /**
   * Get client script URL
   */
  getClientScript(): string {
    return this.provider.getClientScript();
  }

  /**
   * Render CAPTCHA widget
   */
  renderWidget(containerId: string, options: any = {}): string {
    return this.provider.renderWidget(containerId, options);
  }

  /**
   * Check if action requires CAPTCHA
   */
  isEnabledForAction(action: string): boolean {
    return this.config.enabledForActions.includes(action);
  }

  /**
   * Get configuration
   */
  getConfig(): CaptchaConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CaptchaConfig>): void {
    this.config = { ...this.config, ...updates };
    this.provider = this.createProvider(this.config);
  }

  /**
   * Reset retry count for client
   */
  resetRetryCount(clientId: string): void {
    this.retryCount.delete(clientId);
  }

  /**
   * Get retry count for client
   */
  getRetryCount(clientId: string): number {
    return this.retryCount.get(clientId) || 0;
  }

  /**
   * Check if client has exceeded retry limit
   */
  private hasExceededRetryLimit(clientId: string): boolean {
    const count = this.retryCount.get(clientId) || 0;
    return count >= this.config.retryLimit;
  }

  /**
   * Increment retry count for client
   */
  private incrementRetryCount(clientId: string): void {
    const current = this.retryCount.get(clientId) || 0;
    this.retryCount.set(clientId, current + 1);
  }

  /**
   * Create provider instance based on config
   */
  private createProvider(config: CaptchaConfig): CaptchaProvider {
    switch (config.provider) {
      case 'recaptcha-v2':
        return new RecaptchaV2Provider(
          config.siteKey,
          config.secretKey,
          config
        );
      case 'recaptcha-v3':
        return new RecaptchaV3Provider(
          config.siteKey,
          config.secretKey,
          config
        );
      case 'hcaptcha':
        return new HCaptchaProvider(config.siteKey, config.secretKey, config);
      case 'turnstile':
        return new TurnstileProvider(config.siteKey, config.secretKey, config);
      default:
        throw new Error(`Unsupported CAPTCHA provider: ${config.provider}`);
    }
  }
}

/**
 * CAPTCHA middleware factory
 */
export function createCaptchaMiddleware(
  captchaManager: CaptchaManager,
  options: {
    requiredActions?: string[];
    getClientId?: (request: Request) => string;
    getAction?: (request: Request) => string;
  } = {}
) {
  const {
    requiredActions = [],
    getClientId = (request) =>
      request.headers.get('x-forwarded-for') || 'unknown',
    getAction = (request) =>
      new URL(request.url).pathname.split('/').pop() || 'unknown',
  } = options;

  return async (request: Request): Promise<Response | null> => {
    // Only check CAPTCHA for specified actions or methods
    const action = getAction(request);
    const method = request.method.toUpperCase();

    // Skip GET requests and non-required actions
    if (
      method === 'GET' ||
      (requiredActions.length > 0 && !requiredActions.includes(action))
    ) {
      return null;
    }

    // Check if CAPTCHA is enabled for this action
    if (!captchaManager.isEnabledForAction(action)) {
      return null;
    }

    // Extract CAPTCHA token from request
    const contentType = request.headers.get('content-type') || '';
    let captchaToken: string | null = null;

    if (contentType.includes('application/json')) {
      try {
        const body = await request.clone().json();
        captchaToken = body.captchaToken || body.captcha - token || body.token;
      } catch {
        // Ignore JSON parsing errors
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const formData = await request.clone().formData();
        captchaToken =
          (formData.get('captcha-token') as string) ||
          (formData.get('captchaToken') as string) ||
          (formData.get('token') as string);
      } catch {
        // Ignore form parsing errors
      }
    }

    // Also check headers
    if (!captchaToken) {
      captchaToken =
        request.headers.get('x-captcha-token') ||
        request.headers.get('captcha-token');
    }

    if (!captchaToken) {
      return new Response(
        JSON.stringify({
          error: 'CAPTCHA required',
          message: 'CAPTCHA verification is required for this action',
          captchaRequired: true,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Verify CAPTCHA
    const clientId = getClientId(request);
    const remoteIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const result = await captchaManager.verify(
      captchaToken,
      action,
      remoteIp,
      clientId
    );

    if (!result.success) {
      const status = result?.errorCodes?.includes('retry-limit-exceeded')
        ? 429
        : 400;

      return new Response(
        JSON.stringify({
          error: 'CAPTCHA verification failed',
          message: 'CAPTCHA verification failed. Please try again.',
          errorCodes: result.errorCodes,
          retryCount: result?.metadata?.retryCount,
          fallbackRequired: result['metadata']?.fallbackRequired,
        }),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Add verification result to request for use in handlers
    (request as any).captchaVerification = result;

    return null; // Allow request to continue
  };
}

/**
 * Create global CAPTCHA manager instance
 */
export function createGlobalCaptchaManager(
  config: CaptchaConfig
): CaptchaManager {
  return new CaptchaManager(config);
}

export default CaptchaManager;
