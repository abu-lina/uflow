import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const SECRET = 'sb_secret_should_never_leak';

async function body() {
  const res = await GET();
  return { res, json: await res.json() };
}

describe('GET /api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('keeps all existing fields', async () => {
    const { res, json } = await body();
    expect(res.status).toBe(200);
    expect(json).toEqual(
      expect.objectContaining({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: expect.anything(),
        version: expect.any(String),
      }),
    );
  });

  it.each(['uat', 'production', 'development'])('reports appEnv %s from APP_ENV', async (v) => {
    vi.stubEnv('APP_ENV', v);
    expect((await body()).json.appEnv).toBe(v);
  });

  it('defaults appEnv to development when APP_ENV is unknown', async () => {
    vi.stubEnv('APP_ENV', 'staging');
    expect((await body()).json.appEnv).toBe('development');
  });

  it('defaults appEnv to development when APP_ENV is unset', async () => {
    vi.stubEnv('APP_ENV', '');
    expect((await body()).json.appEnv).toBe('development');
  });

  it('reports the subdomain as supabaseProjectRef', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcd1234.supabase.co');
    expect((await body()).json.supabaseProjectRef).toBe('abcd1234');
  });

  it.each(['http://127.0.0.1:54321', 'http://localhost:54321'])(
    'reports local for %s',
    async (url) => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
      expect((await body()).json.supabaseProjectRef).toBe('local');
    },
  );

  it('reports null for a malformed URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'not a url');
    expect((await body()).json.supabaseProjectRef).toBeNull();
  });

  it('reports null for a missing URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect((await body()).json.supabaseProjectRef).toBeNull();
  });

  it('never exposes the full URL or any key on success', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcd1234.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', SECRET);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
    const text = JSON.stringify((await body()).json);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain('https://abcd1234.supabase.co');
  });

  it('never exposes secrets on the error path', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SECRET);
    vi.spyOn(process, 'uptime').mockImplementation(() => {
      throw new Error(`boom ${SECRET}`);
    });
    const { res, json } = await body();
    expect(res.status).toBe(500);
    expect(JSON.stringify(json)).not.toContain(SECRET);
  });
});
