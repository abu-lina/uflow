// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

import EditImagesPage from './page';

let resolveProvider: (v: { data: unknown; error: null }) => void;

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => new Promise((res) => (resolveProvider = res)),
        }),
      }),
    }),
  },
}));
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  use: <T,>(x: T): T => x,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('@/components/layout/EditSubPageLayout', () => ({
  EditSubPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${JSON.stringify(vars)}` : key,
  }),
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img alt={alt} src={src} />,
}));

const URL_NEW = 'https://abc.supabase.co/storage/new.jpg';
const URL_OLD = 'https://abc.supabase.co/old.jpg';
const fetchMock = vi.fn();

const candidatesResponse = () =>
  new Response(
    JSON.stringify({
      data: [
        { id: 'c1', source: 'google_maps_apify', enrichment_type: 'image', image_url: URL_NEW },
      ],
    }),
    { status: 200 },
  );

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Provider Images tab pending candidates (#795)', () => {
  it('approving a candidate adds its URL once to the selected images, even if the initial load resolves later', async () => {
    fetchMock
      .mockResolvedValueOnce(candidatesResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    render(<EditImagesPage params={{ id: 'prov-1' } as unknown as Promise<{ id: string }>} />);

    // The panel's count badge is the pending-candidates hint on the Images tab
    expect((await screen.findByTestId('image-candidates-count')).textContent).toBe('1');

    fireEvent.click(await screen.findByRole('button', { name: /candidates\.approve/ }));
    await waitFor(() => expect(screen.queryByTestId('image-candidates-count')).toBeNull());

    // The initial provider load resolves only after the approve and is stale (lacks the approved URL)
    resolveProvider({
      data: { provider_images: JSON.stringify({ urls: [URL_OLD] }) },
      error: null,
    });

    await waitFor(() => expect(screen.getAllByAltText(/^Preview \d+$/)).toHaveLength(2));
    const srcs = screen.getAllByAltText(/^Preview \d+$/).map((i) => i.getAttribute('src'));
    expect(srcs.filter((s) => s === URL_NEW)).toHaveLength(1);
    expect(srcs).toContain(URL_OLD);
  });
});
