// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '../../..');

const DELETED_FILES = [
  'src/components/shared/CommunityServicesGallery.tsx',
  'src/components/shared/CommunityServiceGallery.tsx',
  'src/__tests__/components/CommunityServicesGallery.test.tsx',
];

describe('remove unused CommunityServicesGallery (#938)', () => {
  it.each(DELETED_FILES)('%s is deleted', (file) => {
    expect(existsSync(resolve(ROOT, file))).toBe(false);
  });

  it('no source file imports CommunityServicesGallery', () => {
    const result = execSync(
      'grep -r "CommunityServicesGallery" src/ --include="*.ts" --include="*.tsx" -l || true',
      { cwd: ROOT, encoding: 'utf-8' },
    ).trim();
    const remaining = result
      .split('\n')
      .filter(Boolean)
      // Allow this test file itself
      .filter((f) => !f.includes('remove-unused-gallery'));
    expect(remaining).toEqual([]);
  });

  it('no source file imports CommunityServiceGallery (singular)', () => {
    const result = execSync(
      'grep -r "CommunityServiceGallery" src/ --include="*.ts" --include="*.tsx" -l || true',
      { cwd: ROOT, encoding: 'utf-8' },
    ).trim();
    const remaining = result
      .split('\n')
      .filter(Boolean)
      .filter((f) => !f.includes('remove-unused-gallery'));
    expect(remaining).toEqual([]);
  });
});
