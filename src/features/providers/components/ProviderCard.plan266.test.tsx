import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cardSource = readFileSync(resolve(__dirname, 'ProviderCard.tsx'), 'utf8');

describe('Plan 266 matched menu item card rendering', () => {
  it('[pre-fix FAILS] renders matched menu items with a translated label', () => {
    expect(cardSource).toContain('matched_menu_items');
    expect(cardSource).toContain("t('providers.serves')");
  });
});
