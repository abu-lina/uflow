import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { runtimeCaching } from '@/lib/pwa/runtimeCaching';

const root = path.resolve(__dirname, '../../..');

function readWorkspaceFile(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Plan 211 map tile iPhone regression guardrails', () => {
  it('[pre-fix FAILS / post-fix PASSES] SW image cache regex is scoped to Supabase and not broad', () => {
    // The rule used to live in next.config.js, as
    // @ducanh2912/next-pwa's workboxOptions.runtimeCaching. Request 282 moved it
    // to src/lib/pwa/runtimeCaching.ts, so this asserts against the exported
    // value instead of file text: it now fails on any broadening however the
    // regex is spelled, which the old string match could not do.
    // The image rule is the only one that mentions an image extension; the other
    // two match js/css and the exact start URL.
    const imageRules = runtimeCaching.filter(
      (entry) => entry.matcher instanceof RegExp && entry.matcher.source.includes('png'),
    );
    expect(imageRules).toHaveLength(1);
    const matcher = imageRules[0].matcher as RegExp;

    // Scoped to Supabase: provider photos must still be cached.
    expect(matcher.test('https://abcdefg.supabase.co/storage/v1/object/public/photos/a.jpg')).toBe(
      true,
    );

    // Not broad. Plan 211 was map tiles on iPhone being served from the image
    // cache, so no third-party image host may match.
    for (const foreignImage of [
      'https://tile.openstreetmap.de/12/2048/1361.png',
      'https://a.basemaps.cartocdn.com/light_all/12/2048/1361.png',
      'https://api.iconify.design/lucide.svg?icons=share-2',
      'https://example.com/anything.png',
    ]) {
      expect(matcher.test(foreignImage), `${foreignImage} must not hit the image cache`).toBe(
        false,
      );
    }
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
