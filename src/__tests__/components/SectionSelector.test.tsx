/**
 * Plan 089 M6: SectionSelector component tests
 *
 * Tests that the Section Selector renders FOOD / UMMAH / BUSINESS options
 * and calls the callback when a section is clicked.
 *
 * TDD Gate: written BEFORE creating SectionSelector component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionSelector } from '@/features/search/components/SectionSelector';

// ─── Mock next-intl ──────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ─── Mock LanguageProvider (Plan 090 M1: SectionSelector now uses useLanguage) ──
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'sections.food': 'Food',
        'sections.ummah': 'Ummah',
        'sections.stores': 'Stores',
        'sections.soon': 'Soon',
      };
      return map[key] ?? key;
    },
    language: 'en',
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SectionSelector (Plan 089 M6)', () => {
  it('renders three section buttons', () => {
    render(<SectionSelector selectedSection="food" onSectionChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /food/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ummah/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /stores/i })).toBeInTheDocument();
  });

  it('marks the active section with aria-selected=true', () => {
    render(<SectionSelector selectedSection="ummah" onSectionChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /ummah/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /food/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /stores/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSectionChange with food when food button is clicked', () => {
    const onSectionChange = vi.fn();
    render(<SectionSelector selectedSection="ummah" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /food/i }));
    expect(onSectionChange).toHaveBeenCalledWith('food');
  });

  it('does not call onSectionChange when stores button (inactive) is clicked', () => {
    const onSectionChange = vi.fn();
    render(<SectionSelector selectedSection="food" onSectionChange={onSectionChange} />);
    const storesTab = screen.getByRole('tab', { name: /stores/i });
    expect(storesTab).toBeDisabled();
    fireEvent.click(storesTab);
    expect(onSectionChange).not.toHaveBeenCalled();
  });

  it('renders disabled attribute on inactive section tabs', () => {
    render(<SectionSelector selectedSection="food" onSectionChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /food/i })).not.toBeDisabled();
    expect(screen.getByRole('tab', { name: /ummah/i })).toBeDisabled();
    expect(screen.getByRole('tab', { name: /stores/i })).toBeDisabled();
  });

  it('renders Soon badge on inactive section tabs', () => {
    render(<SectionSelector selectedSection="food" onSectionChange={vi.fn()} />);
    const ummahTab = screen.getByRole('tab', { name: /ummah/i });
    const storesTab = screen.getByRole('tab', { name: /stores/i });
    expect(ummahTab).toHaveTextContent('Soon');
    expect(storesTab).toHaveTextContent('Soon');
  });

  it('clicking inactive section tab does not call onSectionChange', () => {
    const onSectionChange = vi.fn();
    render(<SectionSelector selectedSection="food" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /ummah/i }));
    expect(onSectionChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: /stores/i }));
    expect(onSectionChange).not.toHaveBeenCalled();
  });
});
