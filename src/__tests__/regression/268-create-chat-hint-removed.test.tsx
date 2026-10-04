/**
 * Issue 268 — the /create chooser drops the "Chat Assistant" hint.
 *
 * The hint linked to '/', a dead end (QA finding F10 in
 * agent-output/qa/251-frontend-review.md). The chat-assistant creation path
 * is not a real entry point, so the hint and its locale keys come out
 * entirely rather than being re-pointed.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

const LOCALES = ['en', 'de', 'ar', 'tr', 'ur', 'ps'];

describe('the /create chooser has no Chat Assistant hint', () => {
  const src = readSrc('src/app/(public)/create/page.tsx');

  it('does not reference the chatHint keys', () => {
    expect(src).not.toContain('chatHint');
  });

  it('does not mention the Chat Assistant', () => {
    expect(src).not.toContain('Chat Assistant');
  });

  it('drops the next/link import that only served the hint', () => {
    expect(src).not.toContain('next/link');
  });
});

describe('no locale retains the create.chatHint keys', () => {
  for (const locale of LOCALES) {
    it(`src/translations/${locale}.ts has no chatHint`, () => {
      const file = `src/translations/${locale}.ts`;
      const src = readSrc(file);
      expect(src, file).not.toContain('chatHint');
    });
  }
});

describe('the two provider options survive', () => {
  const src = readSrc('src/app/(public)/create/page.tsx');

  it('still renders both ProviderOptionCards', () => {
    expect(src).toContain("t('create.ownProvider.buttonText')");
    expect(src).toContain("t('create.recommendProvider.buttonText')");
    expect((src.match(/<ProviderOptionCard/g) || []).length).toBe(2);
  });
});
