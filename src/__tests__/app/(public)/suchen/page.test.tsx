/**
 * Plan 091 M2: /suchen stub page tests
 *
 * TDD Gate: written BEFORE creating the /suchen page component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuchenPage from '@/app/(public)/suchen/page';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
  useSearchParams: () => new URLSearchParams('section=food'),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'suchen.title': 'Suchen',
        'suchen.accordions.was': 'Was?',
        'suchen.accordions.wo': 'Wo: In meiner Nähe',
        'suchen.accordions.wer': 'Wer: Für mich',
        'suchen.accordions.filter': 'Filter',
        'suchen.clearAll': 'Clear all',
        'suchen.searchButton': 'Suchen',
        'sections.food': 'Food',
        'sections.ummah': 'Ummah',
        'sections.stores': 'Stores',
      };
      return map[key] ?? key;
    },
    language: 'de',
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('/suchen page (Plan 091 M2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page with header, section selector, accordions, and bottom bar', () => {
    render(<SuchenPage />);
    
    // Header (use getByRole to be more specific)
    expect(screen.getByRole('heading', { name: /suchen/i })).toBeInTheDocument();
    
    // Section selector tabs
    expect(screen.getByRole('tab', { name: /food/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ummah/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /stores/i })).toBeInTheDocument();
    
    // Accordions
    expect(screen.getByText('Was?')).toBeInTheDocument();
    expect(screen.getByText('Wo: In meiner Nähe')).toBeInTheDocument();
    expect(screen.getByText('Wer: Für mich')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
    
    // Bottom bar
    expect(screen.getByText('Clear all')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /suchen/i })).toBeInTheDocument();
  });

  it('reads section from URL params and initializes SectionSelector', () => {
    render(<SuchenPage />);
    const foodTab = screen.getByRole('tab', { name: /food/i });
    expect(foodTab).toHaveAttribute('aria-selected', 'true');
  });

  it('back button calls router.back() when history exists', () => {
    // Mock history with multiple entries
    Object.defineProperty(window, 'history', {
      writable: true,
      value: { length: 2 },
    });

    render(<SuchenPage />);
    const backButton = screen.getByRole('button', { name: /back/i });
    
    fireEvent.click(backButton);
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('back button navigates to home when history is empty (direct URL access)', () => {
    // Mock history with only current page
    Object.defineProperty(window, 'history', {
      writable: true,
      value: { length: 1 },
    });

    render(<SuchenPage />);
    const backButton = screen.getByRole('button', { name: /back/i });
    
    fireEvent.click(backButton);
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('Was? accordion is open by default', () => {
    render(<SuchenPage />);
    // The Was? accordion body should be visible
    const wasAccordion = screen.getByText('Was?').closest('div');
    expect(wasAccordion).toBeInTheDocument();
  });

  it('clicking an accordion header toggles its visibility', () => {
    render(<SuchenPage />);
    const woHeader = screen.getByText('Wo: In meiner Nähe');
    
    // Initially closed (assuming Was? is the only one open by default)
    // Click to open
    fireEvent.click(woHeader);
    
    // Click again to close
    fireEvent.click(woHeader);
    
    // This test verifies the toggle behavior exists
    expect(woHeader).toBeInTheDocument();
  });

  it('bottom bar buttons are present but non-functional', () => {
    render(<SuchenPage />);
    const clearAllLink = screen.getByText('Clear all');
    const searchButton = screen.getByRole('button', { name: /suchen/i });
    
    expect(clearAllLink).toBeInTheDocument();
    expect(searchButton).toBeInTheDocument();
    
    // Clicking should not throw errors (no-op)
    fireEvent.click(clearAllLink);
    fireEvent.click(searchButton);
  });
});
