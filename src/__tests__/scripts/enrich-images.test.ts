import { describe, expect, it, vi } from 'vitest';

import { stageImageCandidate } from '../../../scripts/enrich-images';

describe('stageImageCandidate', () => {
  it('skips insert when a pending candidate already exists', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ candidate_id: 'existing' }], error: null }),
    };

    const insertSpy = vi.fn();

    const client = {
      from: vi.fn((table: string) => {
        if (table !== 'enrichment_candidates') {
          throw new Error('Unexpected table');
        }
        return {
          select: vi.fn(() => selectChain),
          insert: insertSpy,
        };
      }),
    };

    const outcome = await stageImageCandidate(client as never, {
      provider_id: 'provider-1',
      source: 'unsplash',
      source_url: 'https://unsplash.com/photos/abc',
      field_name: 'provider_images',
      proposed_value: { urls: ['https://cdn.example.com/new.webp'] },
      current_value: { urls: [] },
      status: 'pending',
      enriched_at: '2026-05-02T00:00:00.000Z',
      enrichment_type: 'image',
      image_url: 'https://cdn.example.com/new.webp',
      source_service: 'unsplash',
      source_category: 'food',
      attribution: {
        photographer: 'Jane Doe',
        profile_url: 'https://unsplash.com/@jane',
        photo_url: 'https://unsplash.com/photos/abc',
      },
    });

    expect(outcome).toEqual({ outcome: 'skipped-existing' });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('inserts candidate when no existing active rows are found', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const insertSpy = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table !== 'enrichment_candidates') {
          throw new Error('Unexpected table');
        }
        return {
          select: vi.fn(() => selectChain),
          insert: insertSpy,
        };
      }),
    };

    const row = {
      provider_id: 'provider-2',
      source: 'unsplash',
      source_url: 'https://unsplash.com/photos/def',
      field_name: 'provider_images',
      proposed_value: { urls: ['https://cdn.example.com/new-2.webp'] },
      current_value: { urls: [] },
      status: 'pending',
      enriched_at: '2026-05-02T00:00:00.000Z',
      enrichment_type: 'image',
      image_url: 'https://cdn.example.com/new-2.webp',
      source_service: 'unsplash',
      source_category: 'food',
      attribution: {
        photographer: 'John Doe',
        profile_url: 'https://unsplash.com/@john',
        photo_url: 'https://unsplash.com/photos/def',
      },
    };

    const outcome = await stageImageCandidate(client as never, row);

    expect(outcome).toEqual({ outcome: 'staged' });
    expect(insertSpy).toHaveBeenCalledWith(row);
  });

  it('surfaces the Supabase error message and code when the insert fails', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const insertSpy = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'column "image_url" does not exist', code: '42703' },
    });
    const client = {
      from: vi.fn(() => ({ select: vi.fn(() => selectChain), insert: insertSpy })),
    };

    const result = await stageImageCandidate(client as never, { provider_id: 'p' });

    expect(result).toEqual({
      outcome: 'failed',
      error: { message: 'column "image_url" does not exist', code: '42703' },
    });
  });

  it('surfaces the Supabase error message and code when the existence check fails', async () => {
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'permission denied for table enrichment_candidates', code: '42501' },
      }),
    };
    const insertSpy = vi.fn();
    const client = {
      from: vi.fn(() => ({ select: vi.fn(() => selectChain), insert: insertSpy })),
    };

    const result = await stageImageCandidate(client as never, { provider_id: 'p' });

    expect(result).toEqual({
      outcome: 'failed',
      error: { message: 'permission denied for table enrichment_candidates', code: '42501' },
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
