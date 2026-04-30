import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RUNTIME_BOOKMARK_FILES = [
  'src/app/(public)/saved/page.tsx',
  'src/app/(public)/providers/ProvidersContent.tsx',
  'src/components/community-services/CommunityServiceDetailModal.tsx',
  'src/components/providers/ProviderDetailPage.tsx',
  'src/components/providers/ProviderDetailModal.tsx',
] as const;

describe('Plan 114 bookmark typed FK runtime regression', () => {
  it('does not use dropped bookmarkable polymorphic columns in runtime queries', () => {
    for (const relativePath of RUNTIME_BOOKMARK_FILES) {
      const filePath = join(process.cwd(), relativePath);
      const code = readFileSync(filePath, 'utf8');

      expect(code).not.toContain('bookmarkable_id');
      expect(code).not.toContain('bookmarkable_type');
    }
  });

  it('uses typed bookmark FK columns in runtime queries', () => {
    for (const relativePath of RUNTIME_BOOKMARK_FILES) {
      const filePath = join(process.cwd(), relativePath);
      const code = readFileSync(filePath, 'utf8');

      expect(code).toMatch(/provider_id|community_service_id/);
    }
  });
});
