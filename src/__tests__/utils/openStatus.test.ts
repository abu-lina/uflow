import { describe, it, expect } from 'vitest';

import { getOpenStatus } from '@/utils/openStatus';

describe('getOpenStatus', () => {
  it('returns hidden when opening hours are null', () => {
    const result = getOpenStatus(null, new Date('2026-04-28T10:00:00.000Z'));

    expect(result.visible).toBe(false);
  });

  it('returns closed label and next opening text when outside schedule', () => {
    const result = getOpenStatus(
      {
        monday: { open: '00:00', close: '00:01' },
        tuesday: { open: '11:00', close: '22:00' },
      },
      new Date('2026-04-27T12:00:00.000Z'),
    );

    expect(result.visible).toBe(true);
    expect(result.isOpen).toBe(false);
    expect(result.nextChangeTime).toBe('11:00');
    expect(result.nextChangeDay).toBeNull();
  });

  it('defensively hides status for malformed opening hours', () => {
    const result = getOpenStatus(
      {
        monday: 'closed',
      } as unknown as Record<string, unknown>,
      new Date('2026-04-27T10:00:00.000Z'),
    );

    expect(result.visible).toBe(false);
  });

  it('[post-review fix] treats previous-day overnight window as open after midnight', () => {
    const result = getOpenStatus(
      {
        monday: { open: '22:00', close: '02:00' },
        tuesday: null,
      },
      new Date(2026, 3, 28, 1, 0, 0, 0),
    );

    expect(result.visible).toBe(true);
    expect(result.isOpen).toBe(true);
    expect(result.nextChangeTime).toBe('02:00');
    expect(result.nextChangeDay).toBeNull();
  });
});