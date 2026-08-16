import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Plan 211 map tile iPhone regression guardrails', () => {
  it('[pre-fix FAILS / post-fix PASSES] SW image cache regex is scoped to Supabase and not broad', () => {
    const nextConfig = readWorkspaceFile('next.config.js');

    expect(nextConfig).toContain('/^https:\\/\\/[^/]*\\.supabase\\.co\\/.*\\.(?:png|jpg|jpeg|svg|gif)(\\?.*)?$/');
    expect(nextConfig).not.toContain('/^https:\\/\\/.*\\.(?:png|jpg|jpeg|svg|gif)$/');
  });

  it('[pre-fix FAILS / post-fix PASSES] CSP connect-src includes tile.openstreetmap.de', () => {
    const nextConfig = readWorkspaceFile('next.config.js');

    expect(nextConfig).toContain("'https://tile.openstreetmap.de'");
    expect(nextConfig).not.toContain("'https://tile.openstreetmap.org'");
  });

  it('[pre-fix FAILS / post-fix PASSES] SearchMap tile layer does not set crossOrigin', () => {
    const searchMap = readWorkspaceFile('src/features/search/components/SearchMap.tsx');

    expect(searchMap).not.toContain("crossOrigin: 'anonymous'");
  });
});
