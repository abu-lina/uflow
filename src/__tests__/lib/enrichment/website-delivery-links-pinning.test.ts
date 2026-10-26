import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();
vi.mock('node:https', () => ({ request: (...args: unknown[]) => requestMock(...args) }));

import { fetchPublicPage } from '@/lib/enrichment/website-delivery-links';

const PAGE = 'https://tevhid.example/';

// Fakes the TLS connect step: Node calls options.lookup to pick the address it connects to.
function fakeRequest(body = '<a href="https://wolt.com/x">x</a>') {
  requestMock.mockImplementation(
    (
      url: URL,
      options: { lookup: (h: string, o: object, cb: (...a: unknown[]) => void) => void },
      onResponse: (res: Readable) => void,
    ) => {
      const req = Object.assign(new EventEmitter(), {
        end: () =>
          options.lookup(url.hostname, {}, (err: unknown, address: unknown, family: unknown) => {
            if (err) return req.emit('error', err);
            const res = Object.assign(Readable.from([body]), {
              statusCode: 200,
              headers: { 'content-type': 'text/html' },
              connectedTo: { address, family },
            });
            onResponse(res);
          }),
      });
      return req;
    },
  );
}

describe('#801 review: the connection uses the address that was validated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('connects to the validated public address', async () => {
    fakeRequest();
    const lookup = vi.fn(async () => [{ address: '93.184.216.34' }]);
    const page = await fetchPublicPage(PAGE, { lookup });
    expect(page.html).toContain('wolt.com');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('refuses to connect when the host re-resolves to a private address (DNS rebinding)', async () => {
    fakeRequest();
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([{ address: '93.184.216.34' }])
      .mockResolvedValue([{ address: '169.254.169.254' }]);
    await expect(fetchPublicPage(PAGE, { lookup })).rejects.toThrow(/private/i);
  });

  it('answers the connect-time lookup with the checked address in both callback shapes', async () => {
    let captured: ((h: string, o: object, cb: (...a: unknown[]) => void) => void) | undefined;
    requestMock.mockImplementation((_url: URL, options: { lookup: typeof captured }) => {
      captured = options.lookup;
      return Object.assign(new EventEmitter(), { end: () => undefined });
    });
    const lookup = vi.fn(async () => [{ address: '93.184.216.34' }]);
    void fetchPublicPage(PAGE, { lookup, timeoutMs: 50 }).catch(() => undefined);
    await vi.waitFor(() => expect(captured).toBeDefined());

    const single = vi.fn();
    const all = vi.fn();
    captured?.('tevhid.example', {}, single);
    captured?.('tevhid.example', { all: true }, all);
    await vi.waitFor(() => expect(all).toHaveBeenCalled());
    expect(single).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    expect(all).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
  });
});
