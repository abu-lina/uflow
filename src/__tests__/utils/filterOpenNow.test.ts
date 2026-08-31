import { describe, expect, it } from 'vitest';
import { filterOpenNow } from '@/utils/filterOpenNow';

// Opening-hours fixtures are day-of-week-independent so this test suite is
// deterministic regardless of which day it runs on:
// - "always open" uses an overnight window (open === close === '00:00') on
//   every day, which getOpenStatus treats as open at any time.
// - "always closed" sets every day to null (no window at all).
const ALWAYS_OPEN_HOURS = {
  monday: { open: '00:00', close: '00:00' },
  tuesday: { open: '00:00', close: '00:00' },
  wednesday: { open: '00:00', close: '00:00' },
  thursday: { open: '00:00', close: '00:00' },
  friday: { open: '00:00', close: '00:00' },
  saturday: { open: '00:00', close: '00:00' },
  sunday: { open: '00:00', close: '00:00' },
};
const ALWAYS_CLOSED_HOURS = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
};

describe('filterOpenNow', () => {
  const openProvider = { id: 'p-open', opening_hours: ALWAYS_OPEN_HOURS };
  const closedProvider = { id: 'p-closed', opening_hours: ALWAYS_CLOSED_HOURS };
  const noHoursProvider = { id: 'p-no-hours', opening_hours: null };

  it('returns all items unchanged when openNowActive is false', () => {
    const items = [openProvider, closedProvider, noHoursProvider];
    expect(filterOpenNow(items, false)).toEqual(items);
  });

  it('filters out closed and no-hours items when openNowActive is true', () => {
    const items = [openProvider, closedProvider, noHoursProvider];
    const result = filterOpenNow(items, true);

    expect(result).toEqual([openProvider]);
  });

  it('returns an empty array when nothing is open and openNowActive is true', () => {
    const items = [closedProvider, noHoursProvider];
    expect(filterOpenNow(items, true)).toEqual([]);
  });

  it('preserves original ordering of the items that remain open', () => {
    const secondOpenProvider = { id: 'p-open-2', opening_hours: ALWAYS_OPEN_HOURS };
    const items = [openProvider, closedProvider, secondOpenProvider];

    expect(filterOpenNow(items, true)).toEqual([openProvider, secondOpenProvider]);
  });
});
