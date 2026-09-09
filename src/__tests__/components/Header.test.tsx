// @vitest-environment jsdom
/**
 * Plan 153: Desktop header section tabs
 * Plan 227: Desktop header height CSS variable
 * Plan 231: Clearing filters must not re-add stale ?filters= from the URL
 *
 * Tests that the Header renders SectionSelector tabs and clicking a tab
 * navigates to /<section>. Also verifies the ResizeObserver publishes
 * --desktop-header-height on document.documentElement.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render, mockRouterPush } from '../utils/test-utils';
import { Header } from '@/components/layout/Header';

describe('Header Section Tabs (Plan 153)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SectionSelector with three tabs', () => {
    render(<Header />);
    expect(screen.getByRole('tab', { name: /food/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ummah/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /stores/i })).toBeInTheDocument();
  });

  it('does not navigate when Ummah tab (inactive) is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /ummah/i }));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not navigate when Stores tab (inactive) is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /stores/i }));
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('navigates to /food when Food tab is clicked', () => {
    render(<Header />);
    fireEvent.click(screen.getByRole('tab', { name: /food/i }));
    expect(mockRouterPush).toHaveBeenCalledWith('/food');
  });
});

describe('Header desktop height CSS variable (Plan 227)', () => {
  let observeCallback: (entries: { borderBoxSize: { blockSize: number }[] }[]) => void;
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock ResizeObserver to capture its callback and trigger it manually
    global.ResizeObserver = vi.fn().mockImplementation((cb) => {
      observeCallback = cb;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  afterEach(() => {
    document.documentElement.style.removeProperty('--desktop-header-height');
    global.ResizeObserver = originalResizeObserver;
  });

  it('sets --desktop-header-height on document.documentElement when header mounts', () => {
    render(<Header />);

    // Simulate a resize observation with a realistic header height
    observeCallback([{ borderBoxSize: [{ blockSize: 172 }] }]);

    expect(document.documentElement.style.getPropertyValue('--desktop-header-height')).toBe(
      '172px',
    );
  });

  it('updates --desktop-header-height when header resizes', () => {
    render(<Header />);

    observeCallback([{ borderBoxSize: [{ blockSize: 150 }] }]);
    expect(document.documentElement.style.getPropertyValue('--desktop-header-height')).toBe(
      '150px',
    );

    // Simulate a height change (e.g. user logged in, extra row)
    observeCallback([{ borderBoxSize: [{ blockSize: 180 }] }]);
    expect(document.documentElement.style.getPropertyValue('--desktop-header-height')).toBe(
      '180px',
    );
  });
});

describe('Header filter clearing regression (Plan 231)', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = window.location;
    // Simulate a stale URL with ?filters=muslim (the bug scenario)
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, search: '?filters=muslim' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('does not re-add stale filters when handleSearchSubmit receives empty array', () => {
    // Render Header to get its internal handleSearchSubmit wired up
    render(<Header />);

    // Simulate what SearchBar does when clearing filters:
    // It calls onSearchSubmit(query, location, [])
    // Header passes handleSearchSubmit as onSearchSubmit to SearchBar.
    // We find the SearchBar's onSearchSubmit prop by triggering a search with empty filters.

    // The SearchBar's search input + Enter triggers handleSearch() which calls
    // onSearchSubmit(query, location, filters). With our fix, clearing sends [].
    // But we can test the Header's handleSearchSubmit more directly by
    // finding the search input in the rendered Header and triggering Enter.
    const searchInput = screen.getByPlaceholderText(/search in your ummah/i);
    fireEvent.change(searchInput, { target: { value: 'pizza' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    // With the default empty selectedFilters ([]), handleSearch passes [] to
    // onSearchSubmit. Header's handleSearchSubmit should NOT fall back to
    // window.location.search (which has ?filters=muslim).
    expect(mockRouterPush).toHaveBeenCalled();
    const pushedUrl = mockRouterPush.mock.calls[mockRouterPush.mock.calls.length - 1][0];
    expect(pushedUrl).not.toContain('filters=');
  });
});
