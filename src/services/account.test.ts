import { describe, it, expect, vi, afterEach } from 'vitest';

import { accountService } from '@/services/account';

function mockFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('accountService.deleteAccount (#1002)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the delete route without a body and reports the account deleted', async () => {
    const fetchMock = mockFetch(async () => new Response('{"success":true}', { status: 200 }));

    await expect(accountService.deleteAccount()).resolves.toBe('deleted');
    expect(fetchMock).toHaveBeenCalledWith('/api/user/delete-account', { method: 'DELETE' });
  });

  it('reports signed-out when the route answers 401', async () => {
    mockFetch(async () => new Response('{"error":"Unauthorized"}', { status: 401 }));

    await expect(accountService.deleteAccount()).resolves.toBe('signed-out');
  });

  it('throws when the route answers with a server error', async () => {
    mockFetch(async () => new Response('{"error":"Failed to delete account"}', { status: 500 }));

    await expect(accountService.deleteAccount()).rejects.toThrow('500');
  });

  it('throws when the request itself fails', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(accountService.deleteAccount()).rejects.toThrow('Failed to fetch');
  });
});
