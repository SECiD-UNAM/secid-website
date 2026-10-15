// @ts-nocheck
import * as Sentry from '@sentry/browser';
import { BrowserTracing } from '@sentry/tracing';
import { CaptureConsole } from '@sentry/integrations';
import React from 'react';

/**
 * Sentry Monitoring Integration
 * Comprehensive error tracking, performance monitoring, and user feedback
 */

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  debug?: boolean;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
  beforeSendTransaction?: (
    event: Sentry.Transaction
  ) => Sentry.Transaction | null;
}

export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  subscription?: 'free' | 'premium' | 'enterprise';
  role?: 'member' | 'admin' | 'employer';
}

export interface CustomTags {
  feature?: string;
  page?: string;
  action?: string;
  component?: string;
  apiEndpoint?: string;
}

class SentryMonitoring {
  private isInitialized = false;
  private config: SentryConfig;

  constructor(config: SentryConfig) {
    this.config = config;
  }

  /**
   * Initialize Sentry with configuration
   */
  init(): void {
    if (this.isInitialized) {
      console.warn('Sentry already initialized');
      return;
    }

    try {
      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        release: this.config.release,

        // Performance monitoring
        integrations: [
          new BrowserTracing({
            routingInstrumentation: Sentry.browserTracingIntegration(),
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/api\.secid\.org/,
              /^https:\/\/secid\.org/,
            ],
          }),
          new CaptureConsole({
            levels: ['error', 'warn'],
          }),
          new Sentry.Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],

        // Sample rates
        sampleRate: this.config.sampleRate || 1.0,
        tracesSampleRate: this.config.tracesSampleRate || 0.1,
        replaysSessionSampleRate: this.config.replaysSessionSampleRate || 0.1,
        replaysOnErrorSampleRate: this.config.replaysOnErrorSampleRate || 1.0,

        // Debug mode
        debug: this.config.debug || false,

        // Custom hooks
        beforeSend: this.config.beforeSend || this.defaultBeforeSend.bind(this),
        beforeSendTransaction:
          this.config.beforeSendTransaction ||
          this.defaultBeforeSendTransaction.bind(this),

        // Default tags
        initialScope: {
          tags: {
            platform: 'web',
            framework: 'astro',
            feature: 'secid-platform',
          },
          level: 'info',
        },
      });

      this.isInitialized = true;
      console.log('Sentry monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Set user context
   */
  setUser(user: UserContext): void {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      subscription: user.subscription,
      role: user['role'],
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Set custom tags
   */
  setTags(tags: CustomTags): void {
    Sentry.setTags(tags);
  }

  /**
   * Set additional context
   */
  setContext(key: string, context: Record<string, any>): void {
    Sentry.setContext(key, context);
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: Sentry.SeverityLevel = 'info',
    data?: Record<string, any>
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Capture exception
   */
  captureException(
    error: Error,
    tags?: CustomTags,
    extra?: Record<string, any>
  ): string {
    return Sentry.captureException(error, {
      tags,
      extra,
      level: 'error',
    });
  }

  /**
   * Capture message
   */
  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info',
    tags?: CustomTags,
    extra?: Record<string, any>
  ): string {
    return Sentry.captureMessage(message, {
      level,
      tags,
      extra,
    });
  }

  /**
   * Start transaction for performance monitoring
   */
  startTransaction(
    name: string,
    op: string,
    tags?: CustomTags
  ): Sentry.Transaction {
    return Sentry.startTransaction({
      name,
      op,
      tags,
    });
  }

  /**
   * Measure function execution time
   */
  async measureAsync<T>(
    name: string,
    operation: string,
    fn: () => Promise<T>,
    tags?: CustomTags
  ): Promise<T> {
    const transaction = this.startTransaction(name, operation, tags);

    try {
      const result = await fn();
      transaction.setStatus('ok');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      this.captureException(error as Error, tags);
      throw error;
    } finally {
      transaction.finish();
    }
  }

  /**
   * Monitor API calls
   */
  async monitorApiCall<T>(
    endpoint: string,
    method: string,
    fn: () => Promise<T>,
    additionalData?: Record<string, any>
  ): Promise<T> {
    const transaction = this.startTransaction(
      `API ${method} ${endpoint}`,
      'http.client',
      {
        apiEndpoint: endpoint,
        action: 'api_call',
      }
    );

    this.addBreadcrumb(`API ${method} ${endpoint}`, 'http', 'info', {
      endpoint,
      method,
      ...additionalData,
    });

    try {
      const result = await fn();
      transaction.setStatus('ok');
      transaction.setData('response', 'success');
      return result;
    } catch (error) {
      transaction.setStatus('internal_error');
      transaction.setData('error', (error as Error).message);

      this.captureException(
        error as Error,
        {
          apiEndpoint: endpoint,
          action: 'api_error',
        },
        {
          endpoint,
          method,
          ...additionalData,
        }
      );

      throw error;
    } finally {
      transaction.finish();
    }
  }

  /**
   * Monitor component lifecycle
   */
  monitorComponent(
    componentName: string,
    action: 'mount' | 'unmount' | 'update' | 'error',
    data?: Record<string, any>
  ): void {
    this.addBreadcrumb(
      `Component ${action}: ${componentName}`,
      'ui',
      action === 'error' ? 'error' : 'info',
      { component: componentName, action, ...data }
    );

    if (action === 'error') {
      this.captureMessage(
        `Component error in ${componentName}`,
        'error',
        { component: componentName, action: 'component_error' },
        data
      );
    }
  }

  /**
   * Monitor user interactions
   */
  monitorUserAction(
    action: string,
    element?: string,
    page?: string,
    data?: Record<string, any>
  ): void {
    this.addBreadcrumb(`User action: ${action}`, 'user', 'info', {
      action,
      element,
      page,
      ...data,
    });

    this.setTags({
      page,
      action: 'user_interaction',
    });
  }

  /**
   * Monitor navigation
   */
  monitorNavigation(from: string, to: string, duration?: number): void {
    this.addBreadcrumb(`Navigation: ${from} -> ${to}`, 'navigation', 'info', {
      from,
      to,
      duration,
    });

    if (duration) {
      const transaction = this.startTransaction(
        `Navigation to ${to}`,
        'navigation',
        {
          page: to,
          action: 'page_navigation',
        }
      );
      transaction.setData('duration', duration);
      transaction.finish();
    }
  }

  /**
   * Monitor form submissions
   */
  monitorFormSubmission(
    formName: string,
    success: boolean,
    errors?: string[],
    data?: Record<string, any>
  ): void {
    const level = success ? 'info' : 'warning';

    this.addBreadcrumb(
      `Form submission: ${formName} ${success ? 'success' : 'failed'}`,
      'form',
      level,
      { form: formName, success, errors, ...data }
    );

    if (!success && errors) {
      this.captureMessage(
        `Form submission failed: ${formName}`,
        'warning',
        { action: 'form_error', component: formName },
        { errors, ...data }
      );
    }
  }

  /**
   * Monitor search operations
   */
  monitorSearch(
    query: string,
    type: string,
    resultsCount: number,
    duration: number
  ): void {
    this.addBreadcrumb(`Search: "${query}" in ${type}`, 'search', 'info', {
      query,
      type,
      resultsCount,
      duration,
    });

    const transaction = this.startTransaction(`Search in ${type}`, 'search', {
      action: 'search_operation',
    });

    transaction.setData('query', query);
    transaction.setData('type', type);
    transaction.setData('resultsCount', resultsCount);
    transaction.setData('duration', duration);
    transaction.finish();
  }

  /**
   * Monitor authentication events
   */
  monitorAuth(
    action: 'login' | 'logout' | 'register' | 'login_failed',
    userId?: string,
    method?: string
  ): void {
    this.addBreadcrumb(
      `Auth: ${action}`,
      'auth',
      action === 'login_failed' ? 'warning' : 'info',
      { action, userId, method }
    );

    if (action === 'login_failed') {
      this.captureMessage(
        'Login attempt failed',
        'warning',
        { action: 'auth_failed' },
        { method }
      );
    }
  }

  /**
   * Monitor performance metrics
   */
  recordPerformanceMetric(
    name: string,
    value: number,
    unit: string,
    tags?: CustomTags
  ): void {
    this.addBreadcrumb(
      `Performance: ${name} = ${value}${unit}`,
      'performance',
      'info',
      { metric: name, value, unit }
    );

    const transaction = this.startTransaction(
      `Performance: ${name}`,
      'measure',
      tags
    );
    transaction.setData('value', value);
    transaction.setData('unit', unit);
    transaction.finish();
  }

  /**
   * Create user feedback widget
   */
  showUserFeedback(options?: {
    name?: string;
    email?: string;
    subtitle?: string;
    labelName?: string;
    labelEmail?: string;
    labelComments?: string;
    labelSubmit?: string;
    successMessage?: string;
    formTitle?: string;
  }): void {
    if (!this.isInitialized) {
      console.warn('Sentry not initialized, cannot show feedback widget');
      return;
    }

    Sentry.showUserFeedbackWidget({
      title: options?.formTitle || 'Report an Issue',
      subtitle: options?.subtitle || 'Help us improve your experience',
      labelName: options?.labelName || 'Name',
      labelEmail: options?.labelEmail || 'Email',
      labelComments: options?.labelComments || 'What happened?',
      labelSubmit: options?.labelSubmit || 'Submit Feedback',
      successMessage: options?.successMessage || 'Thank you for your feedback!',
      autoInject: true,
    });
  }

  /**
   * Default before send hook
   */
  private defaultBeforeSend(event: Sentry.Event): Sentry.Event | null {
    // Filter out some known non-critical errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value) {
        // Filter out network errors
        if (
          error.value.includes('Network Error') ||
          error.value.includes('fetch')
        ) {
          return null;
        }

        // Filter out script loading errors
        if (
          error.value.includes('Script error') ||
          error.value.includes('ResizeObserver')
        ) {
          return null;
        }
      }
    }

    return event;
  }

  /**
   * Default before send transaction hook
   */
  private defaultBeforeSendTransaction(
    event: Sentry.Transaction
  ): Sentry.Transaction | null {
    // Filter out very short transactions
    if (event.timestamp && event.start_timestamp) {
      const duration = (event['timestamp'] - event.start_timestamp) * 1000;
      if (duration < 10) {
        // Less than 10ms
        return null;
      }
    }

    return event;
  }

  /**
   * Get Sentry status
   */
  getStatus(): {
    initialized: boolean;
    dsn: string;
    environment: string;
    release?: string;
  } {
    return {
      initialized: this.isInitialized,
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: this.config.release,
    };
  }

  /**
   * Flush pending events (useful before page unload)
   */
  async flush(timeout = 5000): Promise<boolean> {
    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      console.error('Failed to flush Sentry events:', error);
      return false;
    }
  }
}

// Singleton instance
let sentryMonitoring: SentryMonitoring | null = null;

/**
 * Initialize Sentry monitoring
 */
export function initSentry(config?: Partial<SentryConfig>): SentryMonitoring {
  const defaultConfig: SentryConfig = {
    dsn: import.meta.env.PUBLIC_SENTRY_DSN || '',
    environment: import.meta.env.PUBLIC_ENVIRONMENT || 'development',
    release: import.meta.env.PUBLIC_APP_VERSION || '1.0.0',
    sampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
    replaysOnErrorSampleRate: 1.0,
    debug: !import.meta.env.PROD,
  };

  const finalConfig = { ...defaultConfig, ...config };

  if (!finalConfig.dsn) {
    console.warn('Sentry DSN not provided, monitoring disabled');
    return new SentryMonitoring(finalConfig);
  }

  sentryMonitoring = new SentryMonitoring(finalConfig);
  sentryMonitoring.init();

  return sentryMonitoring;
}

/**
 * Get the Sentry monitoring instance
 */
export function getSentry(): SentryMonitoring {
  if (!sentryMonitoring) {
    throw new Error('Sentry not initialized. Call initSentry() first.');
  }
  return sentryMonitoring;
}

/**
 * Default error fallback component
 */
const ErrorFallback: React.ComponentType<{
  error: Error;
  reset: () => void;
}> = ({ error, reset }) => {
  return React.createElement(
    'div',
    {
      className:
        'error-boundary p-4 border border-red-200 rounded-lg bg-red-50',
    },
    React.createElement(
      'h3',
      { className: 'text-lg font-semibold text-red-800 mb-2' },
      'Something went wrong'
    ),
    React.createElement(
      'p',
      { className: 'text-red-700 mb-4' },
      error['message']
    ),
    React.createElement(
      'button',
      {
        onClick: reset,
        className:
          'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700',
      },
      'Try again'
    )
  );
};

/**
 * Error boundary HOC for React components
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
) {
  return Sentry.withErrorBoundary(Component, {
    fallback: fallback || ErrorFallback,
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', errorInfo);
    },
  });
}

/**
 * Higher-order function to wrap async functions with Sentry monitoring
 */
export function withSentryMonitoring<
  T extends (...args: any[]) => Promise<any>,
>(fn: T, operationName: string, tags?: CustomTags): T {
  return (async (...args: Parameters<T>) => {
    const sentry = getSentry();
    return sentry.measureAsync(
      operationName,
      'function',
      () => fn(...args),
      tags
    );
  }) as T;
}

export { SentryMonitoring };
export default SentryMonitoring;
