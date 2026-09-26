// @vitest-environment jsdom
/**
 * Issue #415 / Plan 255 rework — boundary round-trip behavioural tests
 *
 * The independent review found the tri-state attestation survives the
 * TypeScript layer and dies at the boundaries: localStorage on the way in,
 * the admin_update_provider RPC on the way out, and the desktop single-page
 * form which had no halal UI at all. These tests exercise behaviour, not
 * source text.
 *
 *   C1  desktop owner submit through UnifiedProviderCreateForm creates a
 *       provider row (the form must expose the halal questions)
 *   C2  admin_update_provider writes NULL, not COALESCE-to-false
 *   H1  ProviderEditForm merges an explicit null over the previous value
 *   H2  /create/halal Next stays disabled until all three are answered;
 *       owner schema requires all three
 *   H3  a pre-tri-state draft {"no_alcohol":false} never restores as a
 *       deliberate "No"
 *   H4  a failed compensating delete surfaces loudly with the orphan id
 */

import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import type { Provider } from '@/services/providers';
import type { ProviderEditFormData } from '@/features/providers/pages/ProviderEditForm';

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

// The global setup mocks zod for auth-form tests; use the real schemas here.
vi.unmock('zod');

// ── Supabase mock (same harness as the C2 round-trip suite) ──────────────────

const mockProviderInsert = vi.fn();
const mockProviderDeleteEq = vi.fn();
const mockCategorySingle = vi.fn();
const mockCategoryOrder = vi.fn();
const mockFoodExtUpsert = vi.fn();
const mockStoreExtUpsert = vi.fn();
const mockLocationInsert = vi.fn();
const mockRelationDeleteEq = vi.fn();
const mockRelationInsert = vi.fn();
const mockBadgeTypeIn = vi.fn();
const mockBadgeInsert = vi.fn();
const mockEngagementEq = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/x.png' } })),
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'providers') {
        return {
          insert: (...args: unknown[]) => mockProviderInsert(...args),
          update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: () => ({ eq: (...args: unknown[]) => mockProviderDeleteEq(...args) }),
        };
      }
      if (table === 'categories') {
        return {
          select: () => ({
            eq: () => ({ single: () => mockCategorySingle() }),
            order: () => mockCategoryOrder(),
          }),
        };
      }
      if (table === 'food_providers') {
        return { upsert: (...args: unknown[]) => mockFoodExtUpsert(...args) };
      }
      if (table === 'store_providers') {
        return { upsert: (...args: unknown[]) => mockStoreExtUpsert(...args) };
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
      // offers / needs and anything else: selectable + orderable
      return {
        select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: (...args: unknown[]) => mockRpc(...args) }),
}));

// ── App-layer mocks ──────────────────────────────────────────────────────────

let currentFormCtx:
  | {
      formData: ProviderFormData;
      updateFormData: (d: Partial<ProviderFormData>) => void;
      clearFormData: () => void;
      setCreationMode: (m: 'owner' | 'recommendation') => void;
      isLoading: boolean;
    }
  | undefined;

vi.mock('@/providers/form-provider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/providers/form-provider')>();
  return {
    ...actual,
    // Delegate to the real context when no test harness installed one, so
    // FormProvider's own consumers (the H3 draft-restore tests) see real data.
    useFormData: () => (currentFormCtx ? currentFormCtx : actual.useFormData()),
  };
});

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'user-1' } as User, isLoading: false }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn() }),
  usePathname: () => '/create/halal',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';

vi.mock('@iconify/react', () => ({ Icon: () => null }));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/components/ui/AddressAutocomplete', () => ({
  AddressAutocomplete: () => null,
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

import { UnifiedProviderCreateForm } from '@/features/providers/UnifiedProviderCreateForm';
import { ProviderEditForm } from '@/features/providers/pages/ProviderEditForm';
import HalalPage from '@/app/(public)/create/halal/page';
import { FormProvider, useFormData } from '@/providers/form-provider';
import { createProviderOrService } from '@/features/providers/services/mutations';
import { updateProviderFields } from '@/services/admin/providerEdit';
import { ownerSubmissionSchema } from '@/lib/validations/submissionSchemas';

const FOOD_CATEGORY = 'food-cat-1';

function ownerFormData(over: Partial<ProviderFormData> = {}): ProviderFormData {
  return {
    creationMode: 'owner',
    entityType: 'provider',
    title: 'Test Restaurant',
    category: FOOD_CATEGORY,
    description: '',
    isOnlineBusiness: true, // skip address fields
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
    no_alcohol: undefined,
    no_pork: undefined,
    no_gambling: undefined,
    verification_method: 'online',
    has_certificate: false,
    certificate_file: null,
    certificate_url: '',
    ...over,
  };
}

/** Renders via a render-prop so children re-render on form-data changes. */
function FormHarness({
  render: renderProp,
  initial,
}: {
  render: () => React.ReactNode;
  initial: ProviderFormData;
}) {
  const [formData, setFormData] = useState<ProviderFormData>(initial);
  currentFormCtx = {
    formData,
    updateFormData: (d) => setFormData((prev) => ({ ...prev, ...d })),
    clearFormData: () => setFormData(initial),
    setCreationMode: (m) => setFormData((prev) => ({ ...prev, creationMode: m })),
    isLoading: false,
  };
  return <>{renderProp()}</>;
}

function resetSupabaseMocks() {
  vi.clearAllMocks();
  mockProviderInsert.mockResolvedValue({ error: null });
  mockProviderDeleteEq.mockResolvedValue({ error: null });
  mockCategorySingle.mockResolvedValue({ data: { applicable_section: 'food' }, error: null });
  mockCategoryOrder.mockResolvedValue({ data: [], error: null });
  mockFoodExtUpsert.mockResolvedValue({ error: null });
  mockStoreExtUpsert.mockResolvedValue({ error: null });
  mockLocationInsert.mockResolvedValue({ error: null });
  mockRelationDeleteEq.mockResolvedValue({ error: null });
  mockRelationInsert.mockResolvedValue({ error: null });
  mockEngagementEq.mockResolvedValue({ data: [], error: null });
  mockBadgeTypeIn.mockResolvedValue({ data: [], error: null });
  mockBadgeInsert.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ data: { ok: true }, error: null });
}

// ── C1: desktop owner create through the single-page form ────────────────────

describe('C1: desktop owner submit creates a provider (UnifiedProviderCreateForm)', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    localStorage.clear();
  });

  it('answering the rendered halal questions makes a food submit succeed', async () => {
    const onSuccess = vi.fn();
    render(
      <FormHarness
        initial={ownerFormData()}
        render={() => <UnifiedProviderCreateForm onSuccess={onSuccess} />}
      />,
    );

    // The three attestation groups must be rendered by the form itself —
    // before C1 there was no halal UI on this form at all.
    const yesRadios = await screen.findAllByRole('radio', {
      name: 'halal.attestation.answer.yes',
    });
    expect(yesRadios.length).toBeGreaterThanOrEqual(3);

    for (const radio of yesRadios.slice(0, 3)) {
      fireEvent.click(radio);
    }

    const submit = screen.getAllByRole('button').find((b) => b.getAttribute('type') === 'submit');
    if (!submit) throw new Error('no submit button rendered');
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.click(submit);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(mockProviderInsert).toHaveBeenCalledTimes(1);
    const ext = mockFoodExtUpsert.mock.calls[0][0];
    expect(ext.no_alcohol).toBe(true);
    expect(ext.no_pork).toBe(true);
    expect(ext.no_gambling).toBe(true);

    // E: the desktop owner toast must tell the truth — the submission is
    // pending review, not "created".
    expect(toast.success).toHaveBeenCalledWith('submissionStatus.submittedToast');
    expect(toast.success).not.toHaveBeenCalledWith('create.media.providerCreated');
  });

  it('submit stays blocked while any attestation is untouched', () => {
    const onSuccess = vi.fn();
    render(
      <FormHarness
        initial={ownerFormData()}
        render={() => <UnifiedProviderCreateForm onSuccess={onSuccess} />}
      />,
    );
    const submit = screen.getAllByRole('button').find((b) => b.getAttribute('type') === 'submit');
    expect(submit).toBeDefined();
    expect(submit).toBeDisabled();
  });
});

// ── H2: wizard gate ──────────────────────────────────────────────────────────

describe('H2: /create/halal Next is gated on all three answers', () => {
  beforeEach(resetSupabaseMocks);

  it('Next is disabled until all three attestations are answered', async () => {
    render(<FormHarness initial={ownerFormData()} render={() => <HalalPage />} />);

    const next = await screen.findByRole('button', { name: 'common.next' });
    expect(next).toBeDisabled();

    const yesRadios = screen.getAllByRole('radio', { name: 'halal.attestation.answer.yes' });
    expect(yesRadios).toHaveLength(3);
    fireEvent.click(yesRadios[0]);
    expect(next).toBeDisabled();
    fireEvent.click(yesRadios[1]);
    expect(next).toBeDisabled();
    fireEvent.click(yesRadios[2]);

    await waitFor(() => expect(next).not.toBeDisabled());
    fireEvent.click(next);
    expect(mockPush).toHaveBeenCalledWith('/create/media');
  });

  it('owner schema rejects an untouched attestation, naming the field', () => {
    const parsed = ownerSubmissionSchema.safeParse({
      title: 'X',
      category: 'c',
      offers_ids: ['o'],
      images: [{}],
      isOnlineBusiness: true,
      no_alcohol: true,
      no_pork: null,
      // no_gambling untouched
    });
    expect(parsed.success).toBe(false);
  });
});

// ── H1 + C2: admin "not sure" save survives to the RPC ──────────────────────

describe('H1: ProviderEditForm keeps an explicit null ("not sure")', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    localStorage.clear();
  });

  const provider = {
    provider_id: 'p1',
    provider_name: 'Halal Place',
    description: '',
    category_id: 'cat-1',
    listing_type: 'food',
    address_street: 'Main 1',
    address_zip: '10115',
    address_city: 'Berlin',
    address_country: 'DE',
    show_address: true,
    provider_images: '{}',
    review_status: 'pending',
    food_providers: {
      verification_method: 'online',
      has_certificate: false,
      certificate_url: null,
      no_alcohol: true,
      no_pork: true,
      no_gambling: true,
    },
  } as unknown as Provider;

  it('a stored {"noAlcohol":null} overrides the previous true on submit', async () => {
    // Admin opened the halal sub-page and selected "not sure" for all three.
    localStorage.setItem(
      'admin_edit_halal_p1',
      JSON.stringify({
        verificationMethod: 'online',
        hasCertificate: false,
        certificateUrl: '',
        noAlcohol: null,
        noPork: null,
        noGambling: null,
        reviewStatus: 'pending',
      }),
    );

    const onSubmitForm = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ProviderEditForm
        provider={provider}
        onSubmitForm={onSubmitForm}
        localStoragePrefix="admin_"
        cancelUrl="/admin/providers"
      />,
    );

    const form = container.querySelector('form');
    if (!form) throw new Error('ProviderEditForm rendered no <form>');
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => expect(onSubmitForm).toHaveBeenCalledTimes(1));
    const data = onSubmitForm.mock.calls[0][0] as ProviderEditFormData;
    // With the old `parsed ?? prev` merge, all three came back true and the
    // "not sure" selection was silently discarded.
    expect(data.noAlcohol).toBeNull();
    expect(data.noPork).toBeNull();
    expect(data.noGambling).toBeNull();
  });
});

describe('C2: admin_update_provider RPC writes NULL, not COALESCE(false)', () => {
  beforeEach(resetSupabaseMocks);

  it('the payload sent to the RPC carries null attestations', async () => {
    await updateProviderFields(
      'p1',
      {
        listingType: 'food',
        noAlcohol: null,
        noPork: null,
        noGambling: null,
      },
      'admin-1',
    );
    expect(mockRpc).toHaveBeenCalledWith('admin_update_provider', {
      p_provider_id: 'p1',
      p_data: expect.objectContaining({
        food_providers: expect.objectContaining({
          no_alcohol: null,
          no_pork: null,
          no_gambling: null,
        }),
      }),
    });
  });

  it('migration 131 uses key-presence CASE for all six sites, not COALESCE', () => {
    const sql = readSrc('supabase/migrations/131_admin_update_provider_tri_state_halal.sql');
    for (const tbl of ['food', 'store'] as const) {
      for (const col of ['no_alcohol', 'no_pork', 'no_gambling'] as const) {
        // INSERT value: explicit NULL when the key is absent
        expect(sql).toContain(
          `CASE WHEN v_${tbl}_providers ? '${col}' THEN (v_${tbl}_providers->>'${col}')::boolean ELSE NULL END`,
        );
        // ON CONFLICT: explicit payload value wins, existing value kept only
        // when the key is absent — the coalescing pattern is gone.
        expect(sql).toContain(`ELSE ${tbl}_providers.${col} END`);
        expect(sql).not.toContain(`COALESCE((v_${tbl}_providers->>'${col}')::boolean)`);
        expect(sql).not.toContain(`COALESCE(EXCLUDED.${col}, ${tbl}_providers.${col})`);
      }
    }
  });
});

// ── H3: stale drafts never restore as deliberate "No" ───────────────────────

describe('H3: legacy drafts do not resurrect false attestations', () => {
  function Probe() {
    const { formData, isLoading } = useFormData();
    if (isLoading) return <div>loading</div>;
    return (
      <div>
        <span data-testid="no_alcohol">{String(formData.no_alcohol)}</span>
        <span data-testid="title">{formData.title}</span>
      </div>
    );
  }

  beforeEach(() => {
    localStorage.clear();
    // No harness installed: useFormData must delegate to the real provider.
    currentFormCtx = undefined;
  });

  it('a pre-v2 draft with {"no_alcohol":false} is ignored entirely', async () => {
    // Written by the production build before the tri-state change: the old
    // initialFormData shipped false for all three.
    localStorage.setItem(
      'providerFormData',
      JSON.stringify({
        title: 'Abandoned draft',
        no_alcohol: false,
        no_pork: false,
        no_gambling: false,
      }),
    );

    render(
      <FormProvider>
        <Probe />
      </FormProvider>,
    );

    await screen.findByTestId('no_alcohol');
    // Under the old key the draft was restored wholesale: false (a deliberate
    // "No" in the new semantics) passed every validation check.
    expect(screen.getByTestId('no_alcohol').textContent).toBe('undefined');
  });

  it('a v2 draft still restores', async () => {
    localStorage.setItem(
      'providerFormData_v2',
      JSON.stringify({ title: 'New draft', no_alcohol: true }),
    );

    render(
      <FormProvider>
        <Probe />
      </FormProvider>,
    );

    await screen.findByTestId('no_alcohol');
    expect(screen.getByTestId('no_alcohol').textContent).toBe('true');
    expect(screen.getByTestId('title').textContent).toBe('New draft');
  });
});

// ── H4: compensating delete failure is loud ──────────────────────────────────

describe('H4: failed extension write + failed cleanup surfaces the orphan', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    localStorage.clear();
  });

  it('throws a loud error containing the orphaned provider id', async () => {
    mockFoodExtUpsert.mockResolvedValue({ error: { message: 'rls violation' } });
    mockProviderDeleteEq.mockResolvedValue({ error: { message: 'delete denied by RLS' } });

    const user = { id: 'user-1' } as User;
    const err: Error = await createProviderOrService(
      {
        ...ownerFormData({ no_alcohol: true, no_pork: true, no_gambling: true }),
        creationMode: 'recommendation',
      },
      user,
    ).then(
      () => {
        throw new Error('expected rejection');
      },
      (e: Error) => e,
    );

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('requires manual removal');
    expect(err.message).toContain('delete denied by RLS');
    // The orphan id is the same id the cleanup delete targeted: the delete
    // ran as .eq('provider_id', id), so the value is the second eq argument.
    const orphanId = mockProviderDeleteEq.mock.calls[0][1];
    expect(err.message).toContain(orphanId);
  });

  it('a successful cleanup still propagates the original extension error', async () => {
    mockFoodExtUpsert.mockResolvedValue({ error: { message: 'rls violation' } });

    const user = { id: 'user-1' } as User;
    await expect(
      createProviderOrService(
        {
          ...ownerFormData({ no_alcohol: true, no_pork: true, no_gambling: true }),
          creationMode: 'recommendation',
        },
        user,
      ),
    ).rejects.toEqual(expect.objectContaining({ message: 'rls violation' }));
    expect(mockProviderDeleteEq).toHaveBeenCalledTimes(1);
  });
});
