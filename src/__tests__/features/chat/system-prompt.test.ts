import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

import { buildSystemPrompt } from '@/features/chat/prompts/system-prompt';

describe('buildSystemPrompt', () => {
  it('[Plan 199] instructs the model to set open_now for temporal keywords', async () => {
    const prompt = await buildSystemPrompt();

    expect(prompt).toContain('open_now');
    expect(prompt.toLowerCase()).toMatch(/ge\u00f6ffnet|offen|jetzt/);
  });
});
