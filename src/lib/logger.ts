/**
 * Structured logger for SECiD frontend.
 *
 * Dependency-free. Browser-safe (no Node `process` imports).
 *
 * Two API shapes are exported:
 *
 *  1) Singleton with module-first signature — for ad-hoc call sites:
 *
 *       import { logger } from '@/lib/logger';
 *       logger.info('AuthContext', 'session ready', { uid });
 *
 *  2) Child loggers with module bound once — for files with many calls:
 *
 *       const log = logger.child('AuthContext');
 *       log.error('token refresh failed', { code });
 *
 * In dev (`import.meta.env.DEV === true` or no env signal at all) output is
 * pretty-printed via `console.*` so DevTools renders it readably. In prod
 * each entry is JSON-stringified on a single line so Cloud Logging /
 * browser DevTools can parse it. The file itself is the ONE place
 * `console.*` is allowed (see eslint override on this path).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Browser-safe dev detection. Astro/Vite injects `import.meta.env.DEV`.
 * When no env signal exists (tests, plain Node scripts), default to dev
 * so output is human-readable rather than silently JSON.
 */
function isDev(): boolean {
  try {
    const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
    if (env && typeof env.DEV === 'boolean') return env.DEV;
  } catch {
    // `import.meta` not available — fall through to "dev".
  }
  return true;
}

/**
 * In dev we drop `debug`; in prod we drop `debug` and `info` to keep the
 * console / log stream signal-heavy. Override via `setMinLevel` if needed.
 */
let minLevel: LogLevel = isDev() ? 'info' : 'warn';

export function setMinLevel(level: LogLevel): void {
  minLevel = level;
}

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function emit(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!shouldEmit(level)) return;

  const entry: LogEntry = {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
    ...(data ? { data } : {}),
  };

  if (isDev()) {
    const prefix = `[${entry.timestamp}] ${level.toUpperCase()} ${module}`;
    // Pretty-print: prefix + message + structured data as a separate arg so
    // DevTools renders the object inspector instead of a JSON string.
    switch (level) {
      case 'debug':
        if (data) console.debug(prefix, message, data);
        else console.debug(prefix, message);
        break;
      case 'info':
        if (data) console.info(prefix, message, data);
        else console.info(prefix, message);
        break;
      case 'warn':
        if (data) console.warn(prefix, message, data);
        else console.warn(prefix, message);
        break;
      case 'error':
        if (data) console.error(prefix, message, data);
        else console.error(prefix, message);
        break;
    }
    return;
  }

  // Prod: single-line JSON so log collectors can parse without ambiguity.
  const line = JSON.stringify(entry);
  switch (level) {
    case 'debug':
      console.debug(line);
      break;
    case 'info':
      console.info(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'error':
      console.error(line);
      break;
  }
}

/**
 * Normalize an arbitrary error-ish value into a plain `data` record so
 * callers can pass either `{ ...fields }` OR a raw `Error`/`unknown` as the
 * second arg to `.error(...)` without losing information. Keeps the public
 * type loose but the wire format consistent.
 */
function normalizeErrorData(
  payload?: Record<string, unknown> | Error | unknown
): Record<string, unknown> | undefined {
  if (payload === undefined || payload === null) return undefined;
  if (payload instanceof Error) {
    return {
      errorName: payload.name,
      errorMessage: payload.message,
      errorStack: payload.stack,
    };
  }
  if (typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  return { error: String(payload) };
}

/**
 * Logger bound to a single module name. Returned by `logger.child(...)`
 * and by the legacy `createLogger(...)` factory below.
 *
 * `.error` accepts either a structured-data record OR a raw `Error`/
 * `unknown` payload — keeps existing call sites (e.g. `firebase.ts`) green
 * while new callers can pass `{ ... }` records.
 */
export class ChildLogger {
  constructor(private readonly module: string) {}

  debug(message: string, data?: Record<string, unknown>): void {
    emit('debug', this.module, message, data);
  }
  info(message: string, data?: Record<string, unknown>): void {
    emit('info', this.module, message, data);
  }
  warn(message: string, data?: Record<string, unknown>): void {
    emit('warn', this.module, message, data);
  }
  error(
    message: string,
    data?: Record<string, unknown> | Error | unknown
  ): void {
    emit('error', this.module, message, normalizeErrorData(data));
  }
}

/**
 * Module-first singleton. Use for one-off call sites; for files that log
 * heavily, prefer `logger.child('ModuleName')`.
 */
export interface Logger {
  debug(module: string, message: string, data?: Record<string, unknown>): void;
  info(module: string, message: string, data?: Record<string, unknown>): void;
  warn(module: string, message: string, data?: Record<string, unknown>): void;
  error(
    module: string,
    message: string,
    data?: Record<string, unknown> | Error | unknown
  ): void;
  child(module: string): ChildLogger;
}

export const logger: Logger = {
  debug: (module, message, data) => emit('debug', module, message, data),
  info: (module, message, data) => emit('info', module, message, data),
  warn: (module, message, data) => emit('warn', module, message, data),
  error: (module, message, data) =>
    emit('error', module, message, normalizeErrorData(data)),
  child: (module) => new ChildLogger(module),
};

// ---------------------------------------------------------------------------
// Backward-compatible factories (existing consumers).
//
// `firebase.ts` imports `firebaseLogger` as a child-style logger. Keep these
// exports so migration to the new API can happen file-by-file without a
// flag-day rewrite.
// ---------------------------------------------------------------------------

export function createLogger(module: string): ChildLogger {
  return new ChildLogger(module);
}

export const authLogger = createLogger('auth');
export const apiLogger = createLogger('api');
export const firebaseLogger = createLogger('firebase');
export const stripeLogger = createLogger('stripe');
export const forumLogger = createLogger('forum');
export const jobsLogger = createLogger('jobs');
export const eventsLogger = createLogger('events');

export default logger;
