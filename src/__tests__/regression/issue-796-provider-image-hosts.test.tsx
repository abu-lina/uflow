// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render } from '../utils/test-utils';
import { ProviderDetailModal } from '@/features/providers/pages/ProviderDetailModal';
import { MobileProviderDetail } from '@/features/providers/components/MobileProviderDetail';
import { getAllTrustedImageUrls, isAllowedImageUrl, ALLOWED_IMAGE_HOSTS } from '@/utils/imageUtils';
import { mockProviders } from '../mocks/providerData';
import type { Provider } from '@/services/providers';

const LH3 = 'https://lh3.googleusercontent.com/p/AF1QipExample=w800';
const GZ0 = 'https://gz0.googleusercontent.com/abc123=w800';
const SUPA = 'https://abcdefgh.supabase.co/storage/v1/object/public/images/a.jpg';
const EVIL = 'https://evil.example.com/x.jpg';
const CATEGORY_FALLBACK =
  'https://abcdefgh.supabase.co/storage/v1/object/public/categories/fallback.jpg';

function withImages(urls: string[], categoryUrls: string[] = []): Provider {
  return {
    ...mockProviders[0],
    provider_images: JSON.stringify({ urls }),
    category: {
      ...mockProviders[0].category,
      category_images: JSON.stringify({ urls: categoryUrls }),
    },
  } as unknown as Provider;
}

function renderedSources(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img'))
    .map((img) => decodeURIComponent(img.getAttribute('src') ?? ''))
    .filter((src) => src.includes('http'));
}

function renderModal(provider: Provider) {
  return render(
    <ProviderDetailModal provider={provider} onBookmarkChange={vi.fn()} onClose={vi.fn()} />,
  );
}

describe('#796 provider image hosts', () => {
  it('desktop modal shows lh3 and gz0 googleusercontent URLs', () => {
    const { container } = renderModal(withImages([LH3, GZ0]));
    const srcs = renderedSources(container).join('\n');
    expect(srcs).toContain(LH3);
    expect(srcs).toContain(GZ0);
  });

  it('desktop modal still shows Supabase storage URLs', () => {
    const { container } = renderModal(withImages([SUPA]));
    expect(renderedSources(container).join('\n')).toContain(SUPA);
  });

  it('filters hosts not in the next.config.js remotePatterns', () => {
    expect(isAllowedImageUrl(EVIL)).toBe(false);
    expect(isAllowedImageUrl('http://lh3.googleusercontent.com/x')).toBe(false);
    expect(isAllowedImageUrl('not a url')).toBe(false);
    expect(getAllTrustedImageUrls({ urls: [EVIL, LH3] })).toEqual([LH3]);
    const { container } = renderModal(withImages([EVIL, LH3]));
    const srcs = renderedSources(container).join('\n');
    expect(srcs).not.toContain(EVIL);
    expect(srcs).toContain(LH3);
  });

  it('shared host list covers every https hostname in next.config.js remotePatterns', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');
    const block = config.slice(config.indexOf('remotePatterns'), config.indexOf('formats:'));
    const hosts = [...block.matchAll(/protocol: 'https',\s*hostname: '([^']+)'/g)].map((m) => m[1]);
    expect(hosts.length).toBeGreaterThan(0);
    expect([...ALLOWED_IMAGE_HOSTS].sort()).toEqual([...hosts].sort());
  });

  it('modal has no local isTrustedUrl copy of the host list', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/features/providers/pages/ProviderDetailModal.tsx'),
      'utf8',
    );
    expect(src).not.toContain('isTrustedUrl');
  });

  it('provider with no allowed URLs still gets the category fallback', () => {
    const { container } = renderModal(withImages([EVIL], [CATEGORY_FALLBACK]));
    const srcs = renderedSources(container).join('\n');
    expect(srcs).toContain(CATEGORY_FALLBACK);
    expect(srcs).not.toContain(EVIL);
  });

  it('desktop modal and mobile page show the same image set', () => {
    const provider = withImages([LH3, EVIL, SUPA, GZ0], [CATEGORY_FALLBACK]);
    const desktop = renderedSources(renderModal(provider).container);
    const mobile = renderedSources(render(<MobileProviderDetail provider={provider} />).container);
    const pick = (srcs: string[]) =>
      [LH3, GZ0, SUPA, EVIL].filter((u) => srcs.join('\n').includes(u)).sort();
    expect(pick(desktop)).toEqual([GZ0, LH3, SUPA].sort());
    expect(pick(mobile)).toEqual(pick(desktop));
  });
});
