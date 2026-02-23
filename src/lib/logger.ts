/**
 * Logger utility for SECiD platform
 * Provides structured logging with different log levels and optional remote reporting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  context?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  level: import.meta.env.DEV ? 'debug' : 'warn',
  enableConsole: true,
  enableRemote: import.meta.env.PROD,
};

class Logger {
  private config: LoggerConfig;
  private context?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.context = config.context;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const contextStr = this.context ? `[${this.context}]` : '';
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${dataStr}`;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      data,
      error,
    };

    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, message, data);

      switch (level) {
        case 'debug':
          console.debug(formattedMessage);
          break;
        case 'info':
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage, error || '');
          break;
      }
    }

    if (this.config.enableRemote && level !== 'debug') {
      this.sendToRemote(entry);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    // In production, send logs to a logging service
    // This could be integrated with services like:
    // - Sentry for error tracking
    // - LogRocket for session replay
    // - Custom logging endpoint
    try {
      // Placeholder for remote logging implementation
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry),
      // });
    } catch {
      // Silently fail remote logging to not disrupt the app
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const errorObj = error instanceof Error ? error : undefined;
    const errorData = error instanceof Error
      ? { ...data, errorName: error.name, errorStack: error.stack }
      : { ...data, error: String(error) };
    this.log('error', message, errorData, errorObj);
  }

  /**
   * Create a child logger with a specific context
   */
  child(context: string): Logger {
    const childContext = this.context ? `${this.context}:${context}` : context;
    return new Logger({ ...this.config, context: childContext });
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function to create loggers with specific context
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({ ...config, context });
}

// Pre-configured loggers for different parts of the application
export const authLogger = createLogger('auth');
export const apiLogger = createLogger('api');
export const firebaseLogger = createLogger('firebase');
export const stripeLogger = createLogger('stripe');
export const forumLogger = createLogger('forum');
export const jobsLogger = createLogger('jobs');
export const eventsLogger = createLogger('events');

export default logger;
