// @vitest-environment jsdom
/**
 * Plan 263 — client-side createProviderOrService contract
 *
 * The client function uploads files to storage, then POSTs the form payload
 * to /api/providers. It must not write to the database directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';

const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockStorageGetPublicUrl(...args),
      }),
    },
  },
}));

import {
  createProviderOrService,
  ProviderSubmissionError,
} from '@/features/providers/services/mutations';

const user = { id: 'user-1', email: 'test@test.de' } as unknown as User;

function baseFormData(over: Partial<ProviderFormData> = {}): ProviderFormData {
  return {
    creationMode: 'owner',
    entityType: 'provider',
    title: 'Test Restaurant',
    category: '20c10efe-404b-4a39-bb81-5089a0332d78',
    description: '',
    isOnlineBusiness: false,
    street: 'Main 1',
    zip: '12345',
    city: 'Berlin',
    country: 'DE',
    latitude: null,
    longitude: null,
    showAddress: true,
    website: '',
    instagram: '',
    phone: '',
    email: '',
    offers_ids: [],
    needs_ids: [],
    images: [],
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

describe('createProviderOrService client contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageGetPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://test.supabase.co/storage/v1/object/public/provider-images/x.png',
      },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ provider_id: 'new-provider-id' }),
    });
  });

  it('POSTs the form data to /api/providers and returns the created id', async () => {
    const result = await createProviderOrService(baseFormData(), user);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/providers');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body as string);
    expect(body.title).toBe('Test Restaurant');
    expect(body.creationMode).toBe('owner');
    expect('images' in body).toBe(false);
    expect('certificate_file' in body).toBe(false);
    expect(body.imageUrls).toEqual([]);

    expect(result).toEqual({ provider_id: 'new-provider-id' });
  });

  it('POSTs recommend-flow submissions to /api/providers/recommend (#606)', async () => {
    // The closed-city check is bound to the route server-side; the client
    // only chooses which door to knock on.
    await createProviderOrService(
      baseFormData({ creationMode: 'recommendation', submissionSource: 'recommend' }),
      user,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/providers/recommend');
  });

  it('uploads images first and includes their storage URLs in the payload', async () => {
    const image = new File(['x'], 'photo.png', { type: 'image/png' });

    await createProviderOrService(baseFormData({ images: [image] }), user);

    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.imageUrls).toEqual([
      'https://test.supabase.co/storage/v1/object/public/provider-images/x.png',
    ]);
  });

  it('uploads a certificate file and sends its URL as certificate_url', async () => {
    mockStorageGetPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://test.supabase.co/storage/v1/object/public/certificates/cert.pdf',
      },
    });
    const cert = new File(['cert'], 'halal.pdf', { type: 'application/pdf' });

    await createProviderOrService(baseFormData({ certificate_file: cert }), user);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.certificate_url).toBe(
      'https://test.supabase.co/storage/v1/object/public/certificates/cert.pdf',
    );
  });

  it('surfaces the server error message on a non-2xx response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to submit provider' }),
    });

    await expect(createProviderOrService(baseFormData(), user)).rejects.toThrow(
      'Failed to submit provider',
    );
  });

  it('propagates the server error code, status and extras (#606)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        code: 'PROVIDER_DUPLICATE',
        error: 'This provider already exists.',
        existing: {
          provider_id: 'p-1',
          name: 'Test Restaurant',
          city: 'Berlin',
          status: 'approved',
          href: '/p/p-1',
        },
      }),
    });

    const err = await createProviderOrService(baseFormData(), user).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderSubmissionError);
    expect(err.code).toBe('PROVIDER_DUPLICATE');
    expect(err.status).toBe(409);
    expect(err.existing?.href).toBe('/p/p-1');
  });

  it('carries AUTH_REQUIRED when the server session is gone', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 'AUTH_REQUIRED', error: 'Authentication required' }),
    });

    const err = await createProviderOrService(baseFormData(), user).catch((e) => e);
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(err.status).toBe(401);
  });

  it('a client-side missing user also raises AUTH_REQUIRED', async () => {
    const err = await createProviderOrService(baseFormData(), null).catch((e) => e);
    expect(err.code).toBe('AUTH_REQUIRED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent identical submissions into one request', async () => {
    await Promise.all([
      createProviderOrService(baseFormData(), user),
      createProviderOrService(baseFormData(), user),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws when there is no authenticated user', async () => {
    await expect(createProviderOrService(baseFormData(), null)).rejects.toThrow(
      'Authentication required',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
