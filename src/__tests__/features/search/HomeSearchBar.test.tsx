/**
 * Plan 090 M2: HomeSearchBar component tests
 *
 * TDD Gate: written BEFORE creating HomeSearchBar component.
 * Tests that the HomeSearchBar:
 * - Renders as a navigation affordance (not a functional search input)
 * - Navigates to /providers with the active section param when clicked
 * - Is keyboard accessible
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

  it('displays the localized placeholder text', () => {
    render(<HomeSearchBar activeSection="food" />);
    expect(screen.getByText('Suche starten')).toBeInTheDocument();
  });

  it('navigates to /providers?section=food when clicked with food section', () => {
    render(<HomeSearchBar activeSection="food" />);
    fireEvent.click(screen.getByRole('search'));
    expect(mockPush).toHaveBeenCalledWith('/providers?section=food');
  });

  it('navigates to /providers?section=ummah when clicked with ummah section', () => {
    render(<HomeSearchBar activeSection="ummah" />);
    fireEvent.click(screen.getByRole('search'));
    expect(mockPush).toHaveBeenCalledWith('/providers?section=ummah');
  });

  it('navigates to /providers?section=business when clicked with business section', () => {
    render(<HomeSearchBar activeSection="business" />);
    fireEvent.click(screen.getByRole('search'));
    expect(mockPush).toHaveBeenCalledWith('/providers?section=business');
  });

  it('navigates when Enter key is pressed (keyboard accessible)', () => {
    render(<HomeSearchBar activeSection="food" />);
    fireEvent.keyDown(screen.getByRole('search'), { key: 'Enter' });
    expect(mockPush).toHaveBeenCalledWith('/providers?section=food');
  });

  it('does not navigate on other key presses', () => {
    render(<HomeSearchBar activeSection="food" />);
    fireEvent.keyDown(screen.getByRole('search'), { key: 'Tab' });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('is focusable (has tabIndex)', () => {
    render(<HomeSearchBar activeSection="food" />);
    const region = screen.getByRole('search');
    expect(region).toHaveAttribute('tabIndex', '0');
  });

  it('accepts an optional className prop', () => {
    render(<HomeSearchBar activeSection="food" className="custom-class" />);
    const region = screen.getByRole('search');
    expect(region.className).toContain('custom-class');
  });
});
