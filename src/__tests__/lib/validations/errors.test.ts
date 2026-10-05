import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { toValidationDetails } from '@/lib/validations/errors';

describe('toValidationDetails', () => {
  it('maps issues to { path, message } and dot-joins nested paths', () => {
    const schema = z.object({
      email: z.string().email('Bad email'),
      nested: z.object({ count: z.number() }),
    });
    const result = schema.safeParse({ email: 'bad', nested: { count: 'x' } });
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(toValidationDetails(result.error)).toEqual([
      { path: 'email', message: 'Bad email' },
      { path: 'nested.count', message: 'Invalid input: expected number, received string' },
    ]);
  });

  it('yields an empty path string for root-level issues', () => {
    const result = z.string().safeParse(123);
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(toValidationDetails(result.error)).toEqual([
      { path: '', message: 'Invalid input: expected string, received number' },
    ]);
  });

  it('exposes only path and message — no zod internals leak', () => {
    const result = z.string().uuid().safeParse('nope');
    expect(result.success).toBe(false);
    if (result.success) return;

    const detail = toValidationDetails(result.error)[0];
    expect(Object.keys(detail).sort()).toEqual(['message', 'path']);
  });

  it('stringifies symbol path segments instead of throwing', () => {
    const schema = z.string().refine(() => false, {
      message: 'symbol path issue',
      path: [Symbol('token')],
    });
    const result = schema.safeParse('x');
    expect(result.success).toBe(false);
    if (result.success) return;

    expect(toValidationDetails(result.error)).toEqual([
      { path: 'Symbol(token)', message: 'symbol path issue' },
    ]);
  });
});
