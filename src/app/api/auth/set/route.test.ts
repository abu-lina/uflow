import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

const ACCESS = 'access-token-value-123';
const REFRESH = 'refresh-token-value-456';

function request(body: string | undefined) {
  return new NextRequest('http://localhost/api/auth/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

async function expectRejected(body: string | undefined) {
  const res = await POST(request(body));
  expect(res.status).toBe(400);
  expect(res.cookies.getAll()).toHaveLength(0);
  expect(res.headers.get('set-cookie')).toBeNull();
  const text = await res.text();
  expect(text).not.toContain(ACCESS);
  expect(text).not.toContain(REFRESH);
}

describe('POST /api/auth/set', () => {
  it('valid sign-in and token refresh still sync both cookies', async () => {
    const res = await POST(
      request(JSON.stringify({ access_token: ACCESS, refresh_token: REFRESH })),
    );
    expect(res.status).toBe(200);
    expect(res.cookies.get('sb-access-token')?.value).toBe(ACCESS);
    expect(res.cookies.get('sb-refresh-token')?.value).toBe(REFRESH);
  });

  it('empty body returns 400 and sets no cookies', async () => {
    await expectRejected(undefined);
  });

  it('malformed body returns 400 and sets no cookies', async () => {
    await expectRejected(`{"access_token": "${ACCESS}"`);
  });

  it('incomplete body returns 400 and sets no cookies', async () => {
    await expectRejected(JSON.stringify({ access_token: ACCESS }));
    await expectRejected(JSON.stringify({ refresh_token: REFRESH }));
    await expectRejected(JSON.stringify({ access_token: '', refresh_token: REFRESH }));
  });

  it('non-object or non-string token bodies return 400 and set no cookies', async () => {
    await expectRejected('null');
    await expectRejected('"text"');
    await expectRejected(JSON.stringify({ access_token: 1, refresh_token: REFRESH }));
  });
});
