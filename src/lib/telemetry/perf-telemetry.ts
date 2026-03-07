/**
 * Performance Telemetry Utilities (Plan 033 - Milestone 4)
 *
 * Minimal always-on performance telemetry for route handlers.
 * Tracks request timing and dependency (Supabase) timing at server boundaries.
 *
 * Design principles:
 * - Always-on: no configuration needed for basic timing
 * - Privacy-safe: no PII or query text logged by default
 * - Low overhead: uses performance.now() for high-resolution timing
 * - Structured: outputs JSON for log aggregation in production
 *
 * Usage:
 * ```typescript
 * const ctx = createRequestContext('/api/providers/search');
 *
 * const result = await measureDependency(ctx, 'supabase.providers.select', () =>
 *   supabase.from('providers').select()
 * );
 *
 * logRequestTiming(ctx);
 * ```
 */

/**
 * Timing information for a dependency call
 */
export interface DependencyTiming {
  /** Operation name (e.g., 'supabase.providers.select') */
  operation: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Status: 'success' or 'error' */
  status: 'success' | 'error';
}

/**
 * Request context for tracking performance
 */
export interface RequestContext {
  /** Unique correlation ID for this request */
  correlationId: string;
  /** Route being handled */
  route: string;
  /** High-resolution start time (performance.now()) */
  startTime: number;
  /** Dependency timings collected during request */
  dependencies: DependencyTiming[];
  /** Query params (for internal use, not logged) */
  queryParams?: Record<string, string>;
}

/**
 * Generate a simple correlation ID (UUID v4-like)
 */
function generateCorrelationId(): string {
  // Use crypto.randomUUID if available (Node 19+, modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate a pseudo-random ID
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

/**
 * Get high-resolution time in milliseconds
 */
function now(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
}

/**
 * Create a new request context for tracking performance
 *
 * @param route - The route being handled (e.g., '/api/providers/search')
 * @returns RequestContext with correlation ID and start time
 */
export function createRequestContext(route: string): RequestContext {
  return {
    correlationId: generateCorrelationId(),
    route,
    startTime: now(),
    dependencies: [],
  };
}

/**
 * Measure and record timing for a dependency call (e.g., Supabase query)
 *
 * @param ctx - Request context to record timing in
 * @param operation - Operation name (e.g., 'supabase.providers.select')
 * @param fn - Async function to measure
 * @returns Result of the async function
 */
export async function measureDependency<T>(
  ctx: RequestContext,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startTime = now();
  let status: 'success' | 'error' = 'success';

  try {
    return await fn();
  } catch (error) {
    status = 'error';
    throw error;
  } finally {
    const durationMs = Math.round(now() - startTime);
    ctx.dependencies.push({
      operation,
      durationMs,
      status,
    });
  }
}

/**
 * Log request timing summary
 *
 * In production: outputs structured JSON for log aggregation
 * In development: outputs human-readable format
 *
 * Privacy: Does not log query text or PII by default.
 *
 * @param ctx - Request context with timing data
 */
export function logRequestTiming(ctx: RequestContext): void {
  const totalDurationMs = Math.round(now() - ctx.startTime);

  // Summarize dependencies
  const depSummary = ctx.dependencies.map((d) => ({
    op: d.operation,
    ms: d.durationMs,
    ok: d.status === 'success',
  }));

  // Calculate dependency total
  const depTotalMs = ctx.dependencies.reduce((sum, d) => sum + d.durationMs, 0);

  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'perf',
    correlationId: ctx.correlationId,
    route: ctx.route,
    durationMs: totalDurationMs,
    depTotalMs,
    depCount: ctx.dependencies.length,
    deps: depSummary,
  };

  if (process.env.NODE_ENV === 'production') {
    // Structured JSON for production log aggregation
    console.log(JSON.stringify(logEntry));
  } else {
    // Human-readable format for development
    const depStr = ctx.dependencies
      .map((d) => `${d.operation}:${d.durationMs}ms`)
      .join(', ');
    console.log(
      `[PERF] ${ctx.route} ${totalDurationMs}ms (deps: ${depStr || 'none'}) [${ctx.correlationId}]`,
    );
  }
}
