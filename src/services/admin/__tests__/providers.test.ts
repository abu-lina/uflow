import { describe, it, expect, vi, beforeEach } from 'vitest';

import { deleteProvider } from '../providers';

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

describe('deleteProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockEq.mockReturnValue({ select: mockSelect });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });
  });

  it('should delete provider and return void on success', async () => {
    mockSelect.mockResolvedValue({
      data: [{ provider_id: 'test-id' }],
      error: null,
    });

    await expect(deleteProvider('test-id')).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('providers');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('provider_id', 'test-id');
  });

  it('should throw "Provider not found" when no rows returned', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null });

    await expect(deleteProvider('test-id')).rejects.toThrow('Provider not found');
  });

  it('should throw "Provider not found" when rows is null', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null });

    await expect(deleteProvider('test-id')).rejects.toThrow('Provider not found');
  });

  it('should throw on DB error', async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    await expect(deleteProvider('test-id')).rejects.toThrow(
      'Failed to delete provider: Database connection failed'
    );
  });
});
