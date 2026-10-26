// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, cleanup, fireEvent } from '@testing-library/react';

import { ImageCandidatesPanel } from '../ImageCandidatesPanel';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${JSON.stringify(vars)}` : key,
  }),
}));

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    width,
    height,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) => <img alt={alt} height={height} src={src} width={width} />,
}));

const PROVIDER_ID = 'prov-1';

const candidate = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  provider_id: PROVIDER_ID,
  provider_name: 'Test Provider',
  source: 'google_maps_apify',
  source_service: 'google_maps_apify',
  enrichment_type: 'image',
  field_name: 'provider_images',
  image_url: `https://abc.supabase.co/storage/${id}.jpg`,
  status: 'pending',
  ...over,
});

const listResponse = (rows: unknown[]) =>
  new Response(JSON.stringify({ data: rows, pagination: { total: rows.length } }), { status: 200 });

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ImageCandidatesPanel (#795)', () => {
  it('lists pending image candidates for the provider as thumbnails', async () => {
    fetchMock.mockResolvedValueOnce(
      listResponse([
        candidate('c1'),
        candidate('c2'),
        candidate('d1', { enrichment_type: 'data', image_url: null }),
      ]),
    );
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    const imgs = await screen.findAllByRole('img');
    expect(imgs).toHaveLength(2);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/admin/enrichment/candidates');
    expect(url).toContain(`providerId=${PROVIDER_ID}`);
  });

  it('shows the source and Approve and Reject buttons on each thumbnail', async () => {
    fetchMock.mockResolvedValueOnce(listResponse([candidate('c1')]));
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    const item = (await screen.findByRole('img')).closest('li') as HTMLElement;
    expect(
      within(item).getByText('editProvider.editImages.candidates.source.google_maps_apify'),
    ).toBeTruthy();
    expect(within(item).getByRole('button', { name: /candidates\.approve/ })).toBeTruthy();
    expect(within(item).getByRole('button', { name: /candidates\.reject/ })).toBeTruthy();
  });

  it('approve adds the image to the provider and removes the thumbnail', async () => {
    const onApproved = vi.fn();
    fetchMock
      .mockResolvedValueOnce(listResponse([candidate('c1'), candidate('c2')]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} onApproved={onApproved} />);

    const [first] = await screen.findAllByRole('button', { name: /candidates\.approve/ });
    fireEvent.click(first);

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ action: 'approve', candidateId: 'c1' });
    expect(onApproved).toHaveBeenCalledTimes(1);
  });

  it('reject removes the thumbnail without changing the provider', async () => {
    const onApproved = vi.fn();
    fetchMock
      .mockResolvedValueOnce(listResponse([candidate('c1'), candidate('c2')]))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} onApproved={onApproved} />);

    const [first] = await screen.findAllByRole('button', { name: /candidates\.reject/ });
    fireEvent.click(first);

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      action: 'reject',
      candidateId: 'c1',
    });
    expect(onApproved).not.toHaveBeenCalled();
  });

  it('handles loading state', async () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);
    expect(await screen.findByRole('status')).toBeTruthy();
  });

  it('handles error state on load with the API error message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Boom' }), { status: 500 }),
    );
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Boom');
  });

  it('shows the API error message when approve fails and keeps the thumbnail', async () => {
    fetchMock
      .mockResolvedValueOnce(listResponse([candidate('c1')]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Cannot approve' }), { status: 400 }),
      );
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: /candidates\.approve/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('Cannot approve');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('shows the API error message when reject fails', async () => {
    fetchMock
      .mockResolvedValueOnce(listResponse([candidate('c1')]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Cannot reject' }), { status: 400 }),
      );
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    fireEvent.click(await screen.findByRole('button', { name: /candidates\.reject/ }));

    expect((await screen.findByRole('alert')).textContent).toContain('Cannot reject');
  });

  it('renders no extra section when the provider has no pending image candidates', async () => {
    fetchMock.mockResolvedValueOnce(
      listResponse([candidate('d1', { enrichment_type: 'data', image_url: null })]),
    );
    const { container } = render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(container.innerHTML).toBe('');
  });

  it('shows a count badge when pending candidates exist', async () => {
    fetchMock.mockResolvedValueOnce(listResponse([candidate('c1'), candidate('c2')]));
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    const badge = await screen.findByTestId('image-candidates-count');
    expect(badge.textContent).toBe('2');
  });

  it('renders thumbnails through next/image with a fixed size and alt text', async () => {
    fetchMock.mockResolvedValueOnce(listResponse([candidate('c1')]));
    render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    const img = await screen.findByRole('img');
    expect(img.getAttribute('alt')).toBeTruthy();
    expect(img.getAttribute('width')).toBe('160');
    expect(img.getAttribute('height')).toBe('160');
  });

  it('shows nothing to non-admins (403 from the API)', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
    );
    const { container } = render(<ImageCandidatesPanel providerId={PROVIDER_ID} />);

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(container.innerHTML).toBe('');
  });
});
