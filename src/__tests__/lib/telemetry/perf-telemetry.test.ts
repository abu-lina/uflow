/**
 * Performance Telemetry Tests (Plan 033 - Milestone 4)
 *
 * TDD tests for minimal always-on performance telemetry utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These imports will fail initially (TDD RED phase)
import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
  type RequestContext,
  type DependencyTiming,
} from '@/lib/telemetry/perf-telemetry';

describe('perf-telemetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-07T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRequestContext', () => {
    it('creates a request context with correlation ID and start time', () => {
      const ctx = createRequestContext('/api/providers/search');

      expect(ctx).toBeDefined();
      expect(ctx.correlationId).toBeDefined();
      expect(ctx.correlationId).toMatch(/^[a-f0-9-]+$/i); // UUID-like format
      expect(ctx.route).toBe('/api/providers/search');
      expect(ctx.startTime).toBeDefined();
      expect(typeof ctx.startTime).toBe('number');
    });

    it('generates unique correlation IDs for each request', () => {
      const ctx1 = createRequestContext('/api/test');
      const ctx2 = createRequestContext('/api/test');

      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });
  });

  describe('measureDependency', () => {
    it('measures and records dependency timing', async () => {
      const ctx = createRequestContext('/api/test');

      // Simulate async operation
      const result = await measureDependency(ctx, 'supabase.providers.select', async () => {
        vi.advanceTimersByTime(50);
        return { data: [{ id: 1 }], error: null };
      });

      expect(result.data).toEqual([{ id: 1 }]);
      expect(ctx.dependencies).toBeDefined();
      expect(ctx.dependencies).toHaveLength(1);
      expect(ctx.dependencies[0].operation).toBe('supabase.providers.select');
      expect(ctx.dependencies[0].durationMs).toBeGreaterThanOrEqual(50);
      expect(ctx.dependencies[0].status).toBe('success');
    });

    it('records error status when dependency throws', async () => {
      const ctx = createRequestContext('/api/test');

      await expect(
        measureDependency(ctx, 'supabase.providers.select', async () => {
          vi.advanceTimersByTime(10);
          throw new Error('Database connection failed');
        }),
      ).rejects.toThrow('Database connection failed');

      expect(ctx.dependencies).toHaveLength(1);
      expect(ctx.dependencies[0].status).toBe('error');
      expect(ctx.dependencies[0].durationMs).toBeGreaterThanOrEqual(10);
    });
  });

  describe('logRequestTiming', () => {
    it('logs request timing summary with dependencies', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const ctx = createRequestContext('/api/providers/search');
      ctx.dependencies = [
        { operation: 'supabase.providers.select', durationMs: 45, status: 'success' },
        { operation: 'supabase.offers.select', durationMs: 30, status: 'success' },
      ];

      // Simulate 100ms total request time
      vi.advanceTimersByTime(100);
      logRequestTiming(ctx);

      expect(consoleSpy).toHaveBeenCalled();

      // In dev mode, output format is: [PERF] route time (deps: ...) [correlationId]
      const logCall = consoleSpy.mock.calls[0][0];
      // Should include essential fields (case-insensitive for PERF/perf)
      expect(logCall.toLowerCase()).toContain('perf');
      // Correlation ID is at the end in brackets: [uuid]
      expect(logCall).toMatch(/\[[a-f0-9-]+\]/i);
      expect(logCall).toContain('100ms');

      consoleSpy.mockRestore();
    });

    it('does not log PII or query text by default', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const ctx = createRequestContext('/api/providers/search');
      ctx.queryParams = { q: 'halal restaurant', location: 'Berlin' }; // Simulated query params

      logRequestTiming(ctx);

      const logOutput = consoleSpy.mock.calls.map((c) => JSON.stringify(c)).join('');
      // Should NOT contain the actual search query
      expect(logOutput).not.toContain('halal restaurant');
      // Location is OK as it's bounded/categorical
      // But query text should be redacted or not included

      consoleSpy.mockRestore();
    });
  });
});
