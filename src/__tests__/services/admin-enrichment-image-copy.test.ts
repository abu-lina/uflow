/**
 * #797: approveCandidate copies Google Maps images into Supabase Storage
 * instead of hotlinking them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFrom = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
    storage: { from: (...args: unknown[]) => mockStorageFrom(...args) },
  }),
}));

import { approveCandidate } from '@/services/admin/enrichment';

const SUPABASE_HOST = 'https://abcdefgh.supabase.co';
const GOOGLE_URL = 'https://lh3.googleusercontent.com/p/abc123=w800';
const OLD_URL = `${SUPABASE_HOST}/storage/v1/object/public/provider-images/providers/old.jpg`;
const CANDIDATE_ID = 'cand-001';
const PROVIDER_ID = 'prov-001';

function setup(imageUrls: string[] = [GOOGLE_URL]) {
  const candidate = {
    id: CANDIDATE_ID,
    provider_id: PROVIDER_ID,
    field_name: 'provider_images',
    enrichment_type: 'image',
    source_service: 'google_maps_apify',
    image_url: imageUrls[0],
    proposed_value: { urls: imageUrls },
    current_value: { urls: [OLD_URL] },
    status: 'pending',
  };
  const candidateFetch = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: candidate, error: null }),
  };
  const ownership = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { provider_owner_id: null }, error: null }),
  };
  const providerUpdate = {
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  };
  const candidateUpdate = {
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  };

  let providerCalls = 0;
  let candidateCalls = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'enrichment_candidates')
      return ++candidateCalls === 1 ? candidateFetch : candidateUpdate;
    return ++providerCalls === 1 ? ownership : providerUpdate;
  });
  return { providerUpdate, candidateUpdate };
}

function imageResponse(opts: { type?: string; size?: number; contentLength?: string } = {}) {
  const body = new Uint8Array(opts.size ?? 1024);
  const headers: Record<string, string> = { 'content-type': opts.type ?? 'image/jpeg' };
  if (opts.contentLength) headers['content-length'] = opts.contentLength;
  return new Response(body, { status: 200, headers });
}

describe('approveCandidate: copy Google Maps images to storage (#797)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_HOST);
    vi.stubGlobal('fetch', fetchMock);
    mockStorageFrom.mockReturnValue({ upload: mockUpload, getPublicUrl: mockGetPublicUrl });
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `${SUPABASE_HOST}/storage/v1/object/public/provider-images/${path}` },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('downloads, uploads to provider-images and writes the Supabase public URL', async () => {
    const { providerUpdate, candidateUpdate } = setup();
    fetchMock.mockResolvedValue(imageResponse());

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(true);
    expect(mockStorageFrom).toHaveBeenCalledWith('provider-images');
    expect(mockUpload).toHaveBeenCalledTimes(1);
    const payload = providerUpdate.update.mock.calls[0][0] as {
      provider_images: { urls: string[] };
    };
    expect(payload.provider_images.urls).toHaveLength(2);
    expect(payload.provider_images.urls[0]).toBe(OLD_URL);
    expect(payload.provider_images.urls[1]).toMatch(/^https:\/\/abcdefgh\.supabase\.co\//);
    expect(payload.provider_images.urls).not.toContain(GOOGLE_URL);
    expect(candidateUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'applied' }),
    );
  });

  it('rejects hosts outside the allow-list without fetching', async () => {
    const { providerUpdate, candidateUpdate } = setup(['https://evil.example.com/a.jpg']);

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/host/i);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(providerUpdate.update).not.toHaveBeenCalled();
    expect(candidateUpdate.update).not.toHaveBeenCalled();
  });

  it('rejects non-HTTPS URLs', async () => {
    const { providerUpdate } = setup(['http://lh3.googleusercontent.com/p/abc']);

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(providerUpdate.update).not.toHaveBeenCalled();
  });

  it('rejects a non-image content type and leaves the candidate pending', async () => {
    const { providerUpdate, candidateUpdate } = setup();
    fetchMock.mockResolvedValue(imageResponse({ type: 'text/html' }));

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/content.?type|image/i);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(providerUpdate.update).not.toHaveBeenCalled();
    expect(candidateUpdate.update).not.toHaveBeenCalled();
  });

  it('rejects images over 5 MB', async () => {
    const { providerUpdate } = setup();
    fetchMock.mockResolvedValue(imageResponse({ size: 5 * 1024 * 1024 + 1 }));

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/large|size|5 ?MB/i);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(providerUpdate.update).not.toHaveBeenCalled();
  });

  it('rejects when content-length header already exceeds 5 MB', async () => {
    setup();
    fetchMock.mockResolvedValue(
      imageResponse({ size: 10, contentLength: String(6 * 1024 * 1024) }),
    );

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('fails with the error message when the download fails', async () => {
    const { providerUpdate, candidateUpdate } = setup();
    fetchMock.mockRejectedValue(new Error('network down'));

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('network down');
    expect(providerUpdate.update).not.toHaveBeenCalled();
    expect(candidateUpdate.update).not.toHaveBeenCalled();
  });

  it('fails on a non-2xx download response', async () => {
    const { providerUpdate } = setup();
    fetchMock.mockResolvedValue(new Response('nope', { status: 403 }));

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(providerUpdate.update).not.toHaveBeenCalled();
  });

  it('fails with the error message when the upload fails', async () => {
    const { providerUpdate, candidateUpdate } = setup();
    fetchMock.mockResolvedValue(imageResponse());
    mockUpload.mockResolvedValue({ error: { message: 'bucket full' } });

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('bucket full');
    expect(providerUpdate.update).not.toHaveBeenCalled();
    expect(candidateUpdate.update).not.toHaveBeenCalled();
  });

  it('uses a deterministic path per provider and candidate with upsert (idempotent)', async () => {
    setup();
    fetchMock.mockResolvedValue(imageResponse());
    await approveCandidate(CANDIDATE_ID, 'admin-1');
    const firstPath = mockUpload.mock.calls[0][0] as string;
    const firstOpts = mockUpload.mock.calls[0][2] as { upsert?: boolean };

    mockUpload.mockClear();
    setup();
    fetchMock.mockResolvedValue(imageResponse());
    await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(mockUpload.mock.calls[0][0]).toBe(firstPath);
    expect(firstPath).toContain(PROVIDER_ID);
    expect(firstPath).toContain(CANDIDATE_ID);
    expect(firstOpts.upsert).toBe(true);
  });

  it('does not download images already on the Supabase host', async () => {
    const { providerUpdate } = setup([OLD_URL]);

    const result = await approveCandidate(CANDIDATE_ID, 'admin-1');

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(providerUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ provider_images: { urls: [OLD_URL] } }),
    );
  });
});
