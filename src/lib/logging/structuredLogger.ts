/**
 * Structured logging for production
 * Provides JSON-formatted logs for better observability
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
  metadata?: {
    userId?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  };
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error,
  metadata?: LogEntry['metadata']
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (metadata && Object.keys(metadata).length > 0) {
    entry.metadata = metadata;
  }

  return entry;
}

/**
 * Structured logger
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>, metadata?: LogEntry['metadata']) => {
    const entry = createLogEntry('debug', message, context, undefined, metadata);
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify(entry, null, 2));
    }
  },

  info: (message: string, context?: Record<string, unknown>, metadata?: LogEntry['metadata']) => {
    const entry = createLogEntry('info', message, context, undefined, metadata);
    console.log(JSON.stringify(entry));
  },

  warn: (message: string, context?: Record<string, unknown>, metadata?: LogEntry['metadata']) => {
    const entry = createLogEntry('warn', message, context, undefined, metadata);
    console.warn(JSON.stringify(entry));
  },

  error: (message: string, error?: Error, context?: Record<string, unknown>, metadata?: LogEntry['metadata']) => {
    const entry = createLogEntry('error', message, context, error, metadata);
    console.error(JSON.stringify(entry));
  },
};

/**
 * Extract request metadata for logging
 */
export function getRequestMetadata(request: Request): LogEntry['metadata'] {
  const url = new URL(request.url);
  
  return {
    method: request.method,
    path: url.pathname,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               request.headers.get('x-real-ip') || 
               undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  };
}

