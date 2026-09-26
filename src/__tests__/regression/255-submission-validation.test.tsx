// @vitest-environment jsdom
/**
 * Issue #415 / Plan 255 chunk C3 — submission validation + required fields
 *
 * Validates:
 *   AC5.1  Zod schemas exist for both flows
 *   AC5.2  required sets: recommend = name/city/category/all three halal
 *          answers; owner = existing set + full address + >=1 image
 *   AC5.3  a failed validation names the specific field
 *   AC5.7  anonymous recommender email requires explicit consent
 *   AC5.8  an untouched attestation stays untouched through a localStorage
 *          draft round-trip (JSON.stringify drops undefined)
 *   tri-state subtlety: undefined (untouched) is rejected; null ("not sure")
 *          is a valid deliberate answer
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  recommendSubmissionSchema,
  ownerSubmissionSchema,
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

  it('requires consent only when a recommender email is entered', () => {
    const withEmailNoConsent = recommendSubmissionSchema.safeParse({
      ...validRecommend,
      userEmail: 'person@example.com',
    });
    expect(withEmailNoConsent.success).toBe(false);
    if (!withEmailNoConsent.success) {
      expect(firstIssueField(withEmailNoConsent.error)).toBe('emailConsent');
    }

    expect(
      recommendSubmissionSchema.safeParse({
        ...validRecommend,
        userEmail: 'person@example.com',
        emailConsent: true,
      }).success,
    ).toBe(true);

    // No email -> consent not required
    expect(recommendSubmissionSchema.safeParse({ ...validRecommend, userEmail: '' }).success).toBe(
      true,
    );
  });
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
