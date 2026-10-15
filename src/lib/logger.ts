/**
 * Structured Logging Utility
 *
 * Provides structured JSON logging for production monitoring while maintaining
 * readable console output for development.
 *
 * Usage:
 * ```typescript
 * import { logAuth } from '@/lib/logger';
 *
 * logAuth('info', {
 *   event: 'token_verification_success',
 *   ip: '192.168.1.0',
 *   email: 'u***@example.com',
 *   duration: 150,
 * });
 * ```
 */
import {
  maskEmail,
  maskIdentifier,
  maskIp,
  redactEmails,
  redactError,
} from '@/lib/logging/redact-pii';

export interface LogContext {
  event: string;
  ip?: string;
  email?: string;
  tokenValid?: boolean;
  ipBlocked?: boolean;
  bypassed?: boolean;
  duration?: number;
  error?: string;
  [key: string]: unknown;
}

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  service: string;
  level: LogLevel;
  [key: string]: unknown;
}

const PII_MASKS: Record<string, (value: unknown) => string> = {
  email: maskEmail,
  to: maskEmail,
  recipient: maskEmail,
  useremail: maskEmail,
  ip: maskIp,
  clientip: maskIp,
  identifier: maskIdentifier,
};

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactEmails(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value instanceof Error) {
    return redactError(value);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const maskKey = key.toLowerCase();
        const mask = Object.hasOwn(PII_MASKS, maskKey) ? PII_MASKS[maskKey] : undefined;
        return [key, mask ? mask(entry) : redactValue(entry)];
      }),
    );
  }
  return value;
}

function redactLogContext<T extends LogContext>(context: T): T {
  return redactValue(context) as T;
}

/**
 * Log authentication-related events
 *
 * In production: Outputs structured JSON for log aggregation systems
 * In development: Outputs human-readable format for debugging
 */
export function logAuth(level: LogLevel, context: LogContext): void {
  const safeContext = redactLogContext(context);
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: 'auth',
    level,
    ...safeContext,
  };

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for production log aggregation
    console.log(JSON.stringify(logEntry));
  } else {
    // Human-readable format for development
    const prefix = `[AUTH ${level.toUpperCase()}]`;
    console.log(`${prefix} ${safeContext.event}`, safeContext);
  }
}

/**
 * Log general application events
 */
export function logApp(level: LogLevel, context: LogContext): void {
  const safeContext = redactLogContext(context);
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: 'app',
    level,
    ...safeContext,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const prefix = `[APP ${level.toUpperCase()}]`;
    console.log(`${prefix} ${safeContext.event}`, safeContext);
  }
}

/**
 * Log API route events
 */
export function logApi(level: LogLevel, context: LogContext & { route: string }): void {
  const safeContext = redactLogContext(context);
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: 'api',
    level,
    ...safeContext,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const prefix = `[API ${level.toUpperCase()}]`;
    console.log(`${prefix} ${safeContext.route} - ${safeContext.event}`, safeContext);
  }
}
