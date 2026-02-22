import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * P0 Safety Test: Verify no localhost ingest calls exist in production source code.
 *
 * These tests ensure that debug/agent log HTTP calls to 127.0.0.1
 * are never shipped to production, where they would fail silently
 * on user devices and create unnecessary network noise.
 *
 * Plan 010 — Architecture Finding F1 (CRITICAL)
 */
describe('P0 Safety: No localhost ingest calls in production code', () => {
  const srcDir = path.resolve(__dirname, '../../');

  /**
   * Recursively collect all .ts/.tsx files under a directory,
   * excluding __tests__, node_modules, and .next.
   */
  function collectSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip test directories, node_modules, and build output
      if (
        entry.name === '__tests__' ||
        entry.name === 'node_modules' ||
        entry.name === '.next'
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        results.push(...collectSourceFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  it('should not contain any localhost ingest fetch calls in src/ (excluding tests)', () => {
    const files = collectSourceFiles(srcDir);
    const violations: { file: string; line: number; content: string }[] = [];

    // Match specifically the debug ingest pattern (127.0.0.1:7243/ingest)
    const ingestPattern = /127\.0\.0\.1:\d+\/ingest/;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (ingestPattern.test(line)) {
          violations.push({
            file: path.relative(srcDir, file),
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('should not contain any "#region agent log" blocks in src/ (excluding tests)', () => {
    const files = collectSourceFiles(srcDir);
    const violations: { file: string; line: number }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('#region agent log') || line.includes('#endregion')) {
          violations.push({
            file: path.relative(srcDir, file),
            line: index + 1,
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
