/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Phase tracking: which hook's callback is currently executing?
let currentPhase: 'idle' | 'layout' | 'effect' = 'idle';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  type EffectCb = Parameters<typeof actual.useEffect>[0];
  return {
    ...actual,
    useLayoutEffect: (cb: EffectCb, deps?: unknown[]) => {
      actual.useLayoutEffect(() => {
        const prev = currentPhase;
        currentPhase = 'layout';
        const cleanup = cb();
        currentPhase = prev;
        return cleanup;
      }, deps);
    },
    useEffect: (cb: EffectCb, deps?: unknown[]) => {
      actual.useEffect(() => {
        const prev = currentPhase;
        currentPhase = 'effect';
        const cleanup = cb();
        currentPhase = prev;
        return cleanup;
      }, deps);
    },
  };
});

import { act, render, screen } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '@/providers/LanguageProvider';

function LangDisplay() {
  const { language } = useLanguage();
  return <span data-testid="lang">{language}</span>;
}

describe('LanguageProvider hydration — language settled before paint (#966)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'de';
    currentPhase = 'idle';
  });

  it('runs language detection in useLayoutEffect, not useEffect', async () => {
    localStorage.setItem('preferred-language', 'en');

    const detectionPhases: string[] = [];
    const origGetItem = Storage.prototype.getItem;
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key === 'preferred-language') {
        detectionPhases.push(currentPhase);
      }
      return origGetItem.call(this, key);
    });

    await act(async () => {
      render(
        <LanguageProvider>
          <LangDisplay />
        </LanguageProvider>,
      );
    });

    expect(detectionPhases.length).toBeGreaterThan(0);
    // The first read of 'preferred-language' must happen during a
    // useLayoutEffect callback — that's what prevents the flash.
    expect(detectionPhases[0]).toBe('layout');
    expect(screen.getByTestId('lang').textContent).toBe('en');

    spy.mockRestore();
  });

  it('settles detected navigator language on first render', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      languages: ['tr-TR', 'tr'],
      language: 'tr-TR',
    });

    await act(async () => {
      render(
        <LanguageProvider>
          <LangDisplay />
        </LanguageProvider>,
      );
    });

    expect(screen.getByTestId('lang').textContent).toBe('tr');

    vi.unstubAllGlobals();
  });
});
