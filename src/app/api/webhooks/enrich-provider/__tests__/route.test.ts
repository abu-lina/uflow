import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Set env vars before route module is loaded so module-level consts are defined
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.WEBHOOK_SECRET = 'test-secret';

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

let POST: (request: Request) => Promise<Response>;

beforeAll(async () => {
  POST = (await import('../route')).POST;
});

function buildRequest(
  overrides: Partial<{
    type: string;
    table: string;
    provider_id: string;
    listing_type: string;
    provider_owner_id: string | null;
    secret: string;
  }> = {},
): Request {
  const {
    type = 'INSERT',
    table = 'providers',
    provider_id = '550e8400-e29b-41d4-a716-446655440000',
    listing_type = 'food',
    provider_owner_id = null,
    secret = 'test-secret',
  } = overrides;

  const body = {
    type,
    table,
    record: { provider_id, listing_type, provider_owner_id },
    schema: 'public',
  };

  return new Request('http://localhost/api/webhooks/enrich-provider', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/webhooks/enrich-provider', () => {
  it('inserts pending_enrichments for valid food provider without owner', async () => {
    mockInsert.mockResolvedValue({ error: null });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ accepted: true });
    expect(mockInsert).toHaveBeenCalledWith({
      provider_id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'pending',
      source: null,
      created_at: expect.any(String),
    });
  });

  it('skips non-food providers (no insert)', async () => {
    const response = await POST(buildRequest({ listing_type: 'store' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ accepted: false, reason: 'Not a food provider' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('skips owned providers (no insert)', async () => {
    const response = await POST(buildRequest({ provider_owner_id: 'user-123' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ accepted: false, reason: 'Provider has an owner' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid webhook secret', async () => {
    const response = await POST(buildRequest({ secret: 'wrong-secret' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 400 for missing provider_id', async () => {
    const response = await POST(buildRequest({ provider_id: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Missing provider_id' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid webhook type', async () => {
    const response = await POST(buildRequest({ type: 'UPDATE' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid payload' });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 200 (not 500) when DB insert fails', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB error') });

    const response = await POST(buildRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ accepted: true });
  });
});
