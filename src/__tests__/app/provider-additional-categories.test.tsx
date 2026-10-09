// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * #254: the Secondary Category picker (owner route). The spec asks for one
 * assertion on the cap — a 5th tap is refused with a message rather than
 * a silent no-op, because the DB check it mirrors (max 4 + primary) would
 * otherwise surface as a raw 23514 at save time. The 'all'-section empty
 * state is asserted too: 'all' primaries take no secondaries (R3).
 */

const { mockBack, mockPush, mockGetOptions, mockFrom } = vi.hoisted(() => ({
  mockBack: vi.fn(),
  mockPush: vi.fn(),
  mockGetOptions: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('@iconify/react', () => ({
  Icon: (props: Record<string, unknown>) => <span data-testid="icon" {...props} />,
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/services/categories', () => ({
  getSecondaryCategoryOptions: (id: string) => mockGetOptions(id),
}));

// React 18 in the test env has no `use()` — the page's `use(params)`
// receives a plain object here, matching admin-provider-edit-page.test.tsx.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    use: <T,>(x: T): T => x,
  };
});

import Page from '@/app/(public)/profile/providers/[provider_id]/edit/additional-categories/page';

const PID = '123e4567-e89b-12d3-a456-426614174000';
const params = { provider_id: PID } as unknown as Promise<{ provider_id: string }>;

const fiveCategories = ['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => ({
  category_id: id,
  name_de: `Cat ${id}`,
  name_en: `Cat ${id}`,
  applicable_section: 'food',
}));

function mockSupabaseChains(primaryId = 'cat-a', primarySection = 'food') {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'providers') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { category_id: primaryId }, error: null }),
          }),
        }),
      };
    }
    if (table === 'categories') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { applicable_section: primarySection }, error: null }),
          }),
        }),
      };
    }
    if (table === 'provider_categories') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  });
}

describe('additional-categories picker (owner route, #254)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    mockGetOptions.mockResolvedValue(fiveCategories);
    mockSupabaseChains();
  });

  it('refuses a 5th selection with a message and keeps the first 4', async () => {
    render(<Page params={params} />);

    // Wait for options to render
    await waitFor(() => {
      expect(screen.getByText('Cat c5')).toBeInTheDocument();
    });

    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      fireEvent.click(screen.getByText(`Cat ${id}`));
    }
    fireEvent.click(screen.getByText('Cat c5'));

    expect(
      screen.getByText('editProvider.editAdditionalCategories.maxSelected'),
    ).toBeInTheDocument();

    const stored = JSON.parse(
      localStorage.getItem(`edit_additional_categories_${PID}`) as string,
    ) as string[];
    expect(stored.sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('deselecting frees a slot again', async () => {
    localStorage.setItem(`edit_additional_categories_${PID}`, '["c1","c2","c3","c4"]');

    render(<Page params={params} />);

    await waitFor(() => {
      expect(screen.getByText('Cat c5')).toBeInTheDocument();
    });

    // 5th tap refused while 4 selected
    fireEvent.click(screen.getByText('Cat c5'));
    expect(
      screen.getByText('editProvider.editAdditionalCategories.maxSelected'),
    ).toBeInTheDocument();

    // Deselect one, then the 5th works
    fireEvent.click(screen.getByText('Cat c1'));
    fireEvent.click(screen.getByText('Cat c5'));

    const stored = JSON.parse(
      localStorage.getItem(`edit_additional_categories_${PID}`) as string,
    ) as string[];
    expect(stored.sort()).toEqual(['c2', 'c3', 'c4', 'c5']);
  });

  it('shows the empty state when the primary is in the all section', async () => {
    mockSupabaseChains('cat-all', 'all');

    render(<Page params={params} />);

    await waitFor(() => {
      expect(
        screen.getByText('editProvider.editAdditionalCategories.emptyForAllSection'),
      ).toBeInTheDocument();
    });
    expect(mockGetOptions).not.toHaveBeenCalled();
    expect(screen.queryByText('Cat c1')).not.toBeInTheDocument();
  });
});
