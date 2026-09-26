// @vitest-environment jsdom
/**
 * Issue #415 / Plan 255 chunk C3 — submission validation + required fields
 *
 * Validates:
 *   AC5.1  Zod schemas exist for both flows
 *   AC5.2  required sets: recommend = name/city/category/all three halal
 *          answers; owner = existing set + full address + >=1 image
 *   AC5.3  a failed validation names the specific field
 *   C3b    recommending requires login: no anonymous email/consent fields,
 *          /create/recommend + /create/import-osm gate unauthenticated users,
 *          and the import flow enforces the attestation set
 *   AC5.8  an untouched attestation stays untouched through a localStorage
 *          draft round-trip (JSON.stringify drops undefined)
 *   tri-state subtlety: undefined (untouched) is rejected; null ("not sure")
 *          is a valid deliberate answer
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  recommendSubmissionSchema,
  ownerSubmissionSchema,
  importSubmissionSchema,
  submissionFieldLabelKeys,
  firstIssueField,
} from '@/lib/validations/submissionSchemas';
import { HalalAttestationFields } from '@/components/shared/HalalAttestationFields';
import type { ProviderFormData } from '@/providers/form-provider';

// The global setup mocks zod for auth-form tests; use the real schemas here.
vi.unmock('zod');

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const validRecommend = {
  title: 'Bistro Nur',
  city: 'Berlin',
  category: '20c10efe-404b-4a39-bb81-5089a0332d78',
  no_alcohol: true,
  no_pork: true,
  no_gambling: false,
};

const validOwner = {
  title: 'Bistro Nur',
  category: '20c10efe-404b-4a39-bb81-5089a0332d78',
  offers_ids: ['offer-1'],
  images: [{ name: 'x.png' }],
  isOnlineBusiness: false,
  street: 'Hauptstr. 1',
  zip: '10115',
  city: 'Berlin',
  country: 'Deutschland',
  // H2: the halal step is part of the owner wizard; all three answers are
  // required (null = "not sure" is a valid deliberate answer).
  no_alcohol: true,
  no_pork: null,
  no_gambling: false,
};

describe('recommendSubmissionSchema', () => {
  it('accepts a complete recommendation', () => {
    expect(recommendSubmissionSchema.safeParse(validRecommend).success).toBe(true);
  });

  it.each(['title', 'city', 'category'] as const)(
    'rejects missing %s, naming the field',
    (field) => {
      const parsed = recommendSubmissionSchema.safeParse({ ...validRecommend, [field]: '' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(firstIssueField(parsed.error)).toBe(field);
        expect(submissionFieldLabelKeys[field]).toBeTruthy();
      }
    },
  );

  it.each(['no_alcohol', 'no_pork', 'no_gambling'] as const)(
    'rejects an untouched (undefined) %s, naming the field',
    (field) => {
      const parsed = recommendSubmissionSchema.safeParse({
        ...validRecommend,
        [field]: undefined,
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(firstIssueField(parsed.error)).toBe(field);
      }
    },
  );

  it('accepts an explicit "not sure" (null) as a deliberate answer', () => {
    const parsed = recommendSubmissionSchema.safeParse({
      ...validRecommend,
      no_alcohol: null,
      no_pork: null,
      no_gambling: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('C3b: has no anonymous email or consent fields — recommending requires login', () => {
    // Extra keys are stripped, never required: a stray userEmail/emailConsent
    // cannot become part of the validated payload.
    const parsed = recommendSubmissionSchema.safeParse({
      ...validRecommend,
      userEmail: 'person@example.com',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('userEmail' in parsed.data).toBe(false);
      expect('emailConsent' in parsed.data).toBe(false);
    }
  });
});

describe('importSubmissionSchema', () => {
  const answered = { no_alcohol: true, no_pork: null, no_gambling: false };

  it('accepts a fully answered attestation set including explicit "not sure"', () => {
    expect(importSubmissionSchema.safeParse(answered).success).toBe(true);
    expect(
      importSubmissionSchema.safeParse({ no_alcohol: null, no_pork: null, no_gambling: null })
        .success,
    ).toBe(true);
  });

  it.each(['no_alcohol', 'no_pork', 'no_gambling'] as const)(
    'rejects an untouched (undefined) %s, naming the field',
    (field) => {
      const parsed = importSubmissionSchema.safeParse({ ...answered, [field]: undefined });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(firstIssueField(parsed.error)).toBe(field);
      }
    },
  );
});

describe('ownerSubmissionSchema', () => {
  it('accepts a complete owner submission', () => {
    expect(ownerSubmissionSchema.safeParse(validOwner).success).toBe(true);
  });

  it.each(['title', 'category'] as const)('rejects missing %s, naming the field', (field) => {
    const parsed = ownerSubmissionSchema.safeParse({ ...validOwner, [field]: '' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(firstIssueField(parsed.error)).toBe(field);
    }
  });

  it('rejects missing offers and missing images, naming the field', () => {
    const noOffers = ownerSubmissionSchema.safeParse({ ...validOwner, offers_ids: [] });
    expect(noOffers.success).toBe(false);
    if (!noOffers.success) expect(firstIssueField(noOffers.error)).toBe('offers_ids');

    const noImages = ownerSubmissionSchema.safeParse({ ...validOwner, images: [] });
    expect(noImages.success).toBe(false);
    if (!noImages.success) expect(firstIssueField(noImages.error)).toBe('images');
  });

  it.each(['street', 'zip', 'city', 'country'] as const)(
    'rejects missing address field %s, naming the field',
    (field) => {
      const parsed = ownerSubmissionSchema.safeParse({ ...validOwner, [field]: '' });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues.some((i) => i.path[0] === field)).toBe(true);
      }
    },
  );

  it('skips the address requirement for online businesses', () => {
    const parsed = ownerSubmissionSchema.safeParse({
      ...validOwner,
      isOnlineBusiness: true,
      street: '',
      zip: '',
      city: '',
      country: '',
    });
    expect(parsed.success).toBe(true);
  });

  it.each(['no_alcohol', 'no_pork', 'no_gambling'] as const)(
    'rejects an untouched (undefined) %s, naming the field',
    (field) => {
      const parsed = ownerSubmissionSchema.safeParse({ ...validOwner, [field]: undefined });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(firstIssueField(parsed.error)).toBe(field);
        expect(submissionFieldLabelKeys[field]).toBeTruthy();
      }
    },
  );
});

describe('AC5.8 draft persistence of untouched attestations', () => {
  it('an untouched attestation round-trips through JSON as undefined', () => {
    const draft: Partial<ProviderFormData> = {
      title: 'Draft',
      // no_alcohol etc. deliberately absent (untouched)
    };
    const restored = JSON.parse(JSON.stringify(draft)) as Partial<ProviderFormData>;
    expect(restored.no_alcohol).toBeUndefined();

    // An explicit "not sure" survives as null
    const answered = { no_alcohol: null as boolean | null | undefined };
    const restoredAnswered = JSON.parse(JSON.stringify(answered));
    expect(restoredAnswered.no_alcohol).toBeNull();
  });

  it('a restored draft still fails the required check on untouched attestations', () => {
    const draft = { ...validRecommend, no_alcohol: undefined };
    const restored = JSON.parse(JSON.stringify(draft));
    const parsed = recommendSubmissionSchema.safeParse(restored);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(firstIssueField(parsed.error)).toBe('no_alcohol');
  });
});

describe('HalalAttestationFields untouched state', () => {
  it('renders no pre-selected option when all values are undefined', () => {
    render(
      <HalalAttestationFields
        values={{ no_alcohol: undefined, no_pork: undefined, no_gambling: undefined }}
        onChange={() => {}}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(9);
    for (const radio of radios) {
      expect(radio.getAttribute('aria-checked')).toBe('false');
    }
  });

  it('selecting "not sure" emits null, distinguishable from untouched', () => {
    const onChange = vi.fn();
    render(
      <HalalAttestationFields
        values={{ no_alcohol: undefined, no_pork: true, no_gambling: false }}
        onChange={onChange}
      />,
    );
    const notSureButtons = screen.getAllByText('halal.attestation.answer.notSure');
    fireEvent.click(notSureButtons[0]);
    expect(onChange).toHaveBeenCalledWith('no_alcohol', null);
  });
});

// ── C3b: recommending requires a logged-in user ──────────────────────────────

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('C3b: login gate on recommend + import routes', () => {
  it.each([
    'src/app/(public)/create/recommend/page.tsx',
    'src/app/(public)/create/import-osm/page.tsx',
  ])('%s renders the login lock screen for unauthenticated users', (file) => {
    const src = readSrc(file);
    expect(src).toContain('!isAuthLoading && !user');
    expect(src).toContain('returnUrl');
    expect(src).toContain('create.basics.loginRequired');
  });

  it('middleware no longer lets anonymous visitors into the recommend flows', () => {
    const src = readSrc('src/lib/middleware-utils.ts');
    // The early-access /create/* pass-through now redirects to waitlist for
    // recommend/import routes when there is no access token.
    expect(src).toContain("pathname === '/create/recommend'");
    expect(src).toContain("pathname === '/create/import-osm'");
    expect(src).toContain('!accessToken');
  });

  it.each(['/create/recommend', '/create/import-osm'])(
    'shouldRedirectToWaitlist(%s) redirects an anonymous visitor in early access',
    async (pathname) => {
      const { shouldRedirectToWaitlist } = await import('@/lib/middleware-utils');
      // app not launched, no access token, no waitlist token -> redirect
      await expect(shouldRedirectToWaitlist(pathname, false, undefined, undefined)).resolves.toBe(
        true,
      );
      // a logged-in visitor (access token present) still passes through to the page gate
      await expect(shouldRedirectToWaitlist(pathname, false, 'token', undefined)).resolves.toBe(
        false,
      );
    },
  );
});

describe('C3b: anonymous recommender email removed', () => {
  it.each([
    'src/features/providers/StreamlinedRecommendForm.tsx',
    'src/features/providers/StreamlinedImportForm.tsx',
  ])('%s collects no userEmail or email consent', (file) => {
    const src = readSrc(file);
    expect(src).not.toContain('userEmail');
    expect(src).not.toContain('emailConsent');
  });

  it('mutations.ts never writes providers.recommender_email', () => {
    const src = readSrc('src/features/providers/services/mutations.ts');
    expect(src).not.toContain('recommender_email');
    expect(src).not.toContain('userEmail');
  });
});

describe('C3b: import flow collects halal attestations', () => {
  it('StreamlinedImportForm renders the shared HalalAttestationFields and gates submit on them', () => {
    const src = readSrc('src/features/providers/StreamlinedImportForm.tsx');
    expect(src).toContain('HalalAttestationFields');
    expect(src).toContain('importSubmissionSchema');
    expect(src).toContain('contextFormData.no_alcohol !== undefined');
  });
});
