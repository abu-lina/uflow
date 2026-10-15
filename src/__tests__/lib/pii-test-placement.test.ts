import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('AC10: PII logging tests live under src/__tests__/lib', () => {
  it('keeps no test files under src/lib/logging or at src/lib/auth-pii.test.ts', () => {
    const loggingTests = readdirSync(path.join(root, 'src/lib/logging')).filter((file) =>
      file.endsWith('.test.ts'),
    );

    expect(loggingTests).toEqual([]);
    expect(existsSync(path.join(root, 'src/lib/auth-pii.test.ts'))).toBe(false);
  });

  it.each(['logger.test.ts', 'redact-pii.test.ts', 'auth.test.ts'])(
    'has src/__tests__/lib/%s',
    (file) => {
      expect(existsSync(path.join(root, 'src/__tests__/lib', file))).toBe(true);
    },
  );
});
