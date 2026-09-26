// @vitest-environment jsdom
/**
 * Issue #415 / Plan 255 — trust-boundary behavioural tests
 *
 * Covers the second rework batch: certificate upload (A1), JoinHalal NULL
 * defaults (A2), owner-vs-neutral attestation semantics (A3), unearned seal
 * input (B1), and pending-row leakage into public reads (C).
 *
 *   A1  a certificate file is uploaded to storage and certificate_url is
 *       written; has_certificate without a certificate_url earns no gold
 *       tier in either algorithm
 *   A2  migration 132 drops the COALESCE attestation defaults in
 *       upsert_joinhalal_providers; joinhalal.ts emits null
 *   A3  owner schema rejects null (oath: yes/no only); recommend and
 *       import schemas accept null; oath variant offers no "not sure"
 *   B1  an unanswered verification method earns no seal
 *   C   public reads of `providers` always apply review_status='approved'
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

vi.unmock('zod');

// ── Supabase mock for createProviderOrService (cert upload boundary) ─────────

const mockProviderInsert = vi.fn();
const mockExtUpsert = vi.fn();
const mockRelationDeleteEq = vi.fn();
const mockRelationInsert = vi.fn();
const mockCategorySingle = vi.fn();
const mockLocationInsert = vi.fn();
const mockEngagementEq = vi.fn();
const mockBadgeTypeIn = vi.fn();
const mockBadgeInsert = vi.fn();
const mockCertUpload = vi.fn();
const mockCertPublicUrl = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      // Image uploads go to provider-images; only the certificate path may
      // touch provider-certificates. Recording calls per bucket keeps that
      // boundary honest.
      from: (bucket: string) =>
        bucket === 'provider-certificates'
          ? {
              upload: (...args: unknown[]) => mockCertUpload(...args),
              getPublicUrl: (...args: unknown[]) => mockCertPublicUrl(...args),
            }
          : {
              upload: vi.fn().mockResolvedValue({ error: null }),
              getPublicUrl: vi.fn(() => ({
                data: { publicUrl: 'https://cdn.example.com/img/x.png' },
              })),
            },
    },
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => mockProviderInsert(...args),
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'categories') {
        return { select: () => ({ eq: () => ({ single: () => mockCategorySingle() }) }) };
      }
      if (table === 'food_providers' || table === 'store_providers') {
        return { upsert: (...args: unknown[]) => mockExtUpsert(...args) };
      }
      if (table === 'locations') {
        return { insert: (...args: unknown[]) => mockLocationInsert(...args) };
      }
      if (table === 'provider_offers' || table === 'provider_needs') {
        return {
          delete: () => ({ eq: (...args: unknown[]) => mockRelationDeleteEq(...args) }),
          insert: (...args: unknown[]) => mockRelationInsert(...args),
        };
      }
      if (table === 'provider_engagements') {
        return { select: () => ({ eq: () => mockEngagementEq() }) };
      }
      if (table === 'badge_types') {
        return { select: () => ({ in: (...args: unknown[]) => mockBadgeTypeIn(...args) }) };
      }
      if (table === 'provider_badges') {
        return { insert: (...args: unknown[]) => mockBadgeInsert(...args) };
      }
      return {
        select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { createProviderOrService } from '@/features/providers/services/mutations';
import { computeSealTier } from '@/features/providers/components/ProofTierCard';
import { computeHalalStars } from '@/utils/sectionBadges';
import {
  ownerSubmissionSchema,
  recommendSubmissionSchema,
  importSubmissionSchema,
} from '@/lib/validations/submissionSchemas';
import { fetchSearchSuggestions } from '@/services/providers/suggestions';
import { fetchFilteredCities } from '@/services/providers/cities';
import { getProviderCount } from '@/services/providers/crud';
import { searchProviders } from '@/services/providers/search';
import { transformPage } from '@/lib/import/joinhalal';
import { validateCertificateFile } from '@/lib/validations/certificate';
import { HalalAttestationFields } from '@/components/shared/HalalAttestationFields';

const user = { id: 'user-1' } as User;

function ownerFormData(over: Partial<ProviderFormData> = {}): ProviderFormData {
  return {
    creationMode: 'owner',
    entityType: 'provider',
    title: 'Test Restaurant',
    category: 'cat-food',
    description: '',
    isOnlineBusiness: true,
    street: '',
    zip: '',
    city: '',
    country: '',
    latitude: null,
    longitude: null,
    showAddress: true,
    website: '',
    instagram: '',
    phone: '',
    email: '',
    offers_ids: ['offer-1'],
    needs_ids: [],
    images: [new File(['x'], 'x.png', { type: 'image/png' })],
    selectedCommunityServiceIds: [],
    tags: [],
    socialCategory: '',
    socialTitle: '',
    socialDescription: '',
    no_alcohol: true,
    no_pork: true,
    no_gambling: true,
    verification_method: 'online',
    has_certificate: false,
    certificate_file: null,
    certificate_url: '',
    ...over,
  };
}

function resetMocks() {
  vi.clearAllMocks();
  mockProviderInsert.mockResolvedValue({ error: null });
  mockExtUpsert.mockResolvedValue({ error: null });
  mockCategorySingle.mockResolvedValue({ data: { applicable_section: 'food' }, error: null });
  mockLocationInsert.mockResolvedValue({ error: null });
  mockRelationDeleteEq.mockResolvedValue({ error: null });
  mockRelationInsert.mockResolvedValue({ error: null });
  mockEngagementEq.mockResolvedValue({ data: [], error: null });
  mockBadgeTypeIn.mockResolvedValue({ data: [], error: null });
  mockBadgeInsert.mockResolvedValue({ error: null });
  mockCertUpload.mockResolvedValue({ error: null });
  mockCertPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://cdn.example.com/certificates/cert.pdf' },
  });
}

// ── A1: certificate upload writes a real certificate_url ─────────────────────

describe('A1: certificate upload and the gold-tier guard', () => {
  beforeEach(resetMocks);

  it('uploads certificate_file and stores its public URL in the extension row', async () => {
    const cert = new File(['cert'], 'halal-cert.pdf', { type: 'application/pdf' });

    await createProviderOrService(
      ownerFormData({ certificate_file: cert, has_certificate: true }),
      user,
    );

    expect(mockCertUpload).toHaveBeenCalledTimes(1);
    const ext = mockExtUpsert.mock.calls[0][0];
    expect(ext.certificate_url).toBe('https://cdn.example.com/certificates/cert.pdf');
    expect(ext.has_certificate).toBe(true);
  });

  it('writes has_certificate false and certificate_url null when no file exists', async () => {
    // A toggled flag with no file behind it must not mint a certificate claim.
    await createProviderOrService(
      ownerFormData({ certificate_file: null, has_certificate: true }),
      user,
    );

    expect(mockCertUpload).not.toHaveBeenCalled();
    const ext = mockExtUpsert.mock.calls[0][0];
    expect(ext.certificate_url).toBeNull();
    expect(ext.has_certificate).toBe(false);
  });

  it('rejects a certificate that fails type/size validation', async () => {
    const bad = new File(['x'], 'evil.exe', { type: 'application/x-msdownload' });
    expect(validateCertificateFile(bad)).toBe('invalidType');
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    expect(validateCertificateFile(big)).toBe('tooLarge');
    const ok = new File(['x'], 'c.pdf', { type: 'application/pdf' });
    expect(validateCertificateFile(ok)).toBe('ok');

    await expect(
      createProviderOrService(
        ownerFormData({ certificate_file: bad, has_certificate: true }),
        user,
      ),
    ).rejects.toThrow('Certificate file rejected');
  });

  it('has_certificate without certificate_url earns no gold in computeSealTier', () => {
    const att = { noAlcohol: true, noPork: true, noGambling: true };
    // Old contract: hasCertificate alone → 'gold'.
    expect(computeSealTier('online', true, att, null)).toBe('bronze');
    expect(computeSealTier('onsite', true, att, null)).toBe('silver');
    expect(computeSealTier(null, true, att, null)).toBeNull();
    // With a real URL the toggle still earns gold.
    expect(computeSealTier('online', true, att, 'https://cdn/x.pdf')).toBe('gold');
    expect(computeSealTier(null, true, att, 'https://cdn/x.pdf')).toBe('gold');
  });

  it('has_certificate without certificate_url earns no certificate stars in computeHalalStars', () => {
    // Old contract: certificate alone → 2/4 stars regardless of a stored file.
    expect(
      computeHalalStars({
        verification_method: 'online',
        has_certificate: true,
        certificate_url: null,
        no_alcohol: true,
      }),
    ).toBe(1);
    expect(
      computeHalalStars({
        verification_method: 'onsite',
        has_certificate: true,
        certificate_url: null,
        no_alcohol: true,
      }),
    ).toBe(3);
    // With a stored file the certificate earns its stars again.
    expect(
      computeHalalStars({
        verification_method: 'online',
        has_certificate: true,
        certificate_url: 'https://cdn/x.pdf',
        no_alcohol: true,
      }),
    ).toBe(2);
    expect(
      computeHalalStars({
        verification_method: 'onsite',
        has_certificate: true,
        certificate_url: 'https://cdn/x.pdf',
        no_alcohol: true,
      }),
    ).toBe(4);
  });
});

// ── A2: import defaults write NULL ──────────────────────────────────────────

describe('A2: JoinHalal imports carry no attestation claims', () => {
  it('transformPage emits null for all three attestations', () => {
    const html = `<html><head><script type="application/ld+json" class="rank-math-schema-pro">${JSON.stringify(
      {
        '@graph': [
          {
            '@type': 'Restaurant',
            name: 'Import Restaurant',
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Main 1, 10115 Berlin',
              addressCountry: 'DE',
            },
          },
        ],
      },
    )}</script></head><body></body></html>`;

    const { record } = transformPage(html, 'https://joinhalal.de/restaurant-x/', [], false, []);

    expect(record).not.toBeNull();
    expect(record?.no_alcohol).toBeNull();
    expect(record?.no_pork).toBeNull();
    expect(record?.no_gambling).toBeNull();
  });

  it('migration 132 writes NULL when the payload omits attestation keys', () => {
    const sql = readSrc('supabase/migrations/132_joinhalal_null_attestation_defaults.sql');
    // Direct casts (NULL when absent), not COALESCE-minted claims.
    for (const col of ['no_alcohol', 'no_pork', 'no_gambling'] as const) {
      expect(sql).toContain(`(p.elem->>'${col}')::BOOLEAN`);
      expect(sql).not.toMatch(new RegExp(`COALESCE\\(\\(p\\.elem->>'${col}'\\)::BOOLEAN`));
    }
    // Sanity: the rest of the 091 function is preserved verbatim.
    expect(sql).toContain('ON CONFLICT (import_source, import_source_id)');
    expect(sql).toContain('no_gambling = EXCLUDED.no_gambling');
  });
});

// ── A3: owner oath is yes/no only; recommend/import keep "not sure" ─────────

describe('A3: oath vs neutral attestation semantics', () => {
  const ownerBase = {
    title: 'X',
    category: 'c',
    offers_ids: ['o'],
    images: [{}],
    isOnlineBusiness: true,
  };

  it('owner schema accepts yes/no but rejects null', () => {
    expect(
      ownerSubmissionSchema.safeParse({
        ...ownerBase,
        no_alcohol: true,
        no_pork: false,
        no_gambling: true,
      }).success,
    ).toBe(true);
    // An owner knows their own business — "not sure" is not an oath answer.
    for (const field of ['no_alcohol', 'no_pork', 'no_gambling'] as const) {
      expect(
        ownerSubmissionSchema.safeParse({
          ...ownerBase,
          no_alcohol: true,
          no_pork: true,
          no_gambling: true,
          [field]: null,
        }).success,
        `${field} should reject null`,
      ).toBe(false);
    }
  });

  it('recommend schema accepts null ("not sure") and rejects untouched', () => {
    const base = { title: 'X', city: 'Berlin', category: 'c' };
    expect(
      recommendSubmissionSchema.safeParse({
        ...base,
        no_alcohol: null,
        no_pork: null,
        no_gambling: null,
      }).success,
    ).toBe(true);
    expect(
      recommendSubmissionSchema.safeParse({ ...base, no_alcohol: null, no_pork: null }).success,
    ).toBe(false);
  });

  it('import schema accepts null and rejects untouched', () => {
    expect(
      importSubmissionSchema.safeParse({
        no_alcohol: null,
        no_pork: null,
        no_gambling: null,
      }).success,
    ).toBe(true);
    expect(importSubmissionSchema.safeParse({ no_alcohol: true, no_pork: null }).success).toBe(
      false,
    );
  });

  it('oath variant renders only yes/no; neutral adds "not sure"', () => {
    const noop = () => {};
    const { unmount } = render(
      <HalalAttestationFields
        variant="oath"
        values={{ no_alcohol: undefined, no_pork: undefined, no_gambling: undefined }}
        onChange={noop}
      />,
    );
    expect(screen.getAllByRole('radio', { name: 'halal.attestation.answer.yes' })).toHaveLength(3);
    expect(
      screen.queryByRole('radio', { name: 'halal.attestation.answer.notSure' }),
    ).not.toBeInTheDocument();
    unmount();

    render(
      <HalalAttestationFields
        variant="neutral"
        values={{ no_alcohol: undefined, no_pork: undefined, no_gambling: undefined }}
        onChange={noop}
      />,
    );
    expect(screen.getAllByRole('radio', { name: 'halal.attestation.answer.notSure' })).toHaveLength(
      3,
    );
  });
});

// ── B1: unanswered verification method earns no seal ────────────────────────

describe('B1: no manufactured seal tier', () => {
  it('null verification method yields no tier even with yes attestations', () => {
    const att = { noAlcohol: true, noPork: false, noGambling: false };
    // The old `|| 'online'` manufactured 'bronze' here.
    expect(computeSealTier(null, false, att)).toBeNull();
    expect(computeSealTier(undefined, false, att)).toBeNull();
    // Chosen answers still derive tiers.
    expect(computeSealTier('online', false, att)).toBe('bronze');
    expect(computeSealTier('onsite', false, att)).toBe('silver');
  });
});

// ── C: public reads exclude pending rows ─────────────────────────────────────

function recordingClient() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const makeChain = (): object => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
        }
        if (prop === 'returns') {
          return () => Promise.resolve({ data: [], error: null });
        }
        if (prop === 'single') {
          return () => Promise.resolve({ data: null, error: null });
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return new Proxy({}, handler);
        };
      },
    };
    return new Proxy({}, handler);
  };
  const client = {
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return makeChain();
    },
  };
  return { client: client as never, calls };
}

function approvedEqCalls(calls: Array<{ method: string; args: unknown[] }>) {
  return calls.filter(
    (c) => c.method === 'eq' && c.args[0] === 'review_status' && c.args[1] === 'approved',
  );
}

describe('C: public reads apply review_status=approved (AC7.2)', () => {
  it('fetchSearchSuggestions filters providers to approved', async () => {
    const { client, calls } = recordingClient();
    await fetchSearchSuggestions('ber', 10, client);
    expect(calls.filter((c) => c.method === 'from' && c.args[0] === 'providers').length).toBe(1);
    expect(approvedEqCalls(calls).length).toBeGreaterThanOrEqual(1);
  });

  it('fetchFilteredCities without a search query filters providers to approved', async () => {
    const { client, calls } = recordingClient();
    await fetchFilteredCities(null, null, client);
    expect(approvedEqCalls(calls).length).toBeGreaterThanOrEqual(1);
  });

  it('getProviderCount only counts approved providers', async () => {
    const { client, calls } = recordingClient();
    await getProviderCount(client);
    expect(approvedEqCalls(calls)).toHaveLength(1);
  });

  it('searchProviders without admin options is restricted to approved', async () => {
    const { client, calls } = recordingClient();
    // Empty query: the review_status predicate applies to every read; a
    // non-empty query would also fan out to offers/needs name-search helpers
    // that use the module-global client rather than the injected one.
    await searchProviders(
      '',
      '',
      '',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      client,
    );
    expect(approvedEqCalls(calls).length).toBeGreaterThanOrEqual(1);
  });
});
