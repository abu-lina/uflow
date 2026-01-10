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
 *   ip: '192.168.1.1',
 *   email: 'user@example.com',
 *   duration: 150,
 * });
 * ```
 */

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

/**
 * Log authentication-related events
 * 
 * In production: Outputs structured JSON for log aggregation systems
 * In development: Outputs human-readable format for debugging
 */
export function logAuth(level: LogLevel, context: LogContext): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: 'auth',
    level,
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for production log aggregation
    console.log(JSON.stringify(logEntry));
  } else {
    // Human-readable format for development
    const prefix = `[AUTH ${level.toUpperCase()}]`;
    console.log(`${prefix} ${context.event}`, context);
  }
}

/**
 * Log general application events
 */
export function logApp(level: LogLevel, context: LogContext): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: 'app',
    level,
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const prefix = `[APP ${level.toUpperCase()}]`;
    console.log(`${prefix} ${context.event}`, context);
  }
}

/**
 * Log API route events
 */
export function logApi(level: LogLevel, context: LogContext & { route: string }): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    service: 'api',
    level,
    ...context,
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry));
  } else {
    const prefix = `[API ${level.toUpperCase()}]`;
    console.log(`${prefix} ${context.route} - ${context.event}`, context);
  }
}
