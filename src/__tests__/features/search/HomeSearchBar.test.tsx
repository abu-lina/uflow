/**
 * Plan 090 M2 / Plan 091 M3: HomeSearchBar component tests
 *
 * Tests that the HomeSearchBar:
 * - Renders an inline text input (not a fake navigation affordance)
 * - Shows a sliders button that navigates to /search?section=...
 * - Submits empty query to /search and typed query to /providers
 * - Has correct ARIA attributes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeSearchBar } from '@/features/search/components/HomeSearchBar';

// ─── Mock next/navigation ─────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: vi.fn() }),
}));

// ─── Mock LanguageProvider ────────────────────────────────────────────────────
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'home.searchPlaceholder': 'Suche starten',
        'home.searchAriaLabel': 'Suche in der Ummah starten',
        'home.searchFiltersAriaLabel': 'Suchfilter öffnen',
        'suchen.nearMe.chipLabel': 'Near me',
        'suchen.openNow.chipLabel': 'Open now',
        'suchen.nearMe.permissionDenied': 'Standort nicht verfügbar',
      };
      return map[key] ?? key;
    },
    language: 'de',
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HomeSearchBar (Plan 090 M2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a search region with correct aria-label', () => {
    render(<HomeSearchBar activeSection="food" />);
    const region = screen.getByRole('search');
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-label', 'Suche in der Ummah starten');
  });

  it('renders a text input with localized placeholder', () => {
    render(<HomeSearchBar activeSection="food" />);
    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Suche starten');
  });

  it('sliders button navigates to /search?section=food', () => {
    render(<HomeSearchBar activeSection="food" />);
    fireEvent.click(screen.getByRole('button', { name: 'Suchfilter öffnen' }));
    expect(mockPush).toHaveBeenCalledWith('/search?section=food');
  });

  it('sliders button navigates to /search?section=ummah', () => {
    render(<HomeSearchBar activeSection="ummah" />);
    fireEvent.click(screen.getByRole('button', { name: 'Suchfilter öffnen' }));
    expect(mockPush).toHaveBeenCalledWith('/search?section=ummah');
  });

  it('sliders button navigates to /search?section=store', () => {
    render(<HomeSearchBar activeSection="store" />);
    fireEvent.click(screen.getByRole('button', { name: 'Suchfilter öffnen' }));
    expect(mockPush).toHaveBeenCalledWith('/search?section=store');
  });

  it('pressing Enter with empty input navigates to /search?section=food', () => {
    render(<HomeSearchBar activeSection="food" />);
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/search?section=food');
  });

  it('pressing Enter with a query navigates to /providers with q param', () => {
    render(<HomeSearchBar activeSection="food" />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'shawarma' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/providers?q=shawarma&section=food');
  });

  it('encodes query values when navigating to /providers with q', () => {
    render(<HomeSearchBar activeSection="food" />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'halal burger' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/providers?q=halal%20burger&section=food');
  });

  it('does not navigate on other key presses', () => {
    render(<HomeSearchBar activeSection="food" />);
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Tab' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<HomeSearchBar activeSection="food" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('[post-review fix] uses gap-0 between icon and input', () => {
    render(<HomeSearchBar activeSection="food" />);
    const region = screen.getByRole('search');
    expect(region.className).toContain('gap-0');
    expect(region.className).not.toContain('gap-3');
  });

  it('[pre-fix FAILS / post-fix PASSES] near-me chip is not green while geoStatus is prompting', () => {
    render(<HomeSearchBar activeSection="food" geoStatus="prompting" />);
    const nearMeButton = screen.getByRole('button', { name: /near me/i });
    expect(nearMeButton.className).not.toContain('bg-primary text-white');
    expect(nearMeButton.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('[pre-fix FAILS / post-fix PASSES] near-me chip is green only when geoStatus is granted', () => {
    const { rerender } = render(<HomeSearchBar activeSection="food" geoStatus="granted" />);
    const nearMeButton = screen.getByRole('button', { name: /near me/i });
    expect(nearMeButton.className).toContain('bg-primary text-white');

    rerender(<HomeSearchBar activeSection="food" geoStatus="idle" />);
    expect(screen.getByRole('button', { name: /near me/i }).className).not.toContain('bg-primary text-white');

    rerender(<HomeSearchBar activeSection="food" geoStatus="denied" />);
    expect(screen.getByRole('button', { name: /near me/i }).className).not.toContain('bg-primary text-white');

    rerender(<HomeSearchBar activeSection="food" geoStatus="timeout" />);
    expect(screen.getByRole('button', { name: /near me/i }).className).not.toContain('bg-primary text-white');
  });

  it('[pre-fix FAILS / post-fix PASSES] near-me callback keeps boolean compatibility', () => {
    const onNearMeChange = vi.fn();
    const { rerender } = render(
      <HomeSearchBar activeSection="food" geoStatus="idle" onNearMeChange={onNearMeChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /near me/i }));
    expect(onNearMeChange).toHaveBeenCalledWith(true);

    rerender(<HomeSearchBar activeSection="food" geoStatus="granted" onNearMeChange={onNearMeChange} />);
    fireEvent.click(screen.getByRole('button', { name: /near me/i }));
    expect(onNearMeChange).toHaveBeenLastCalledWith(false);
  });
});
