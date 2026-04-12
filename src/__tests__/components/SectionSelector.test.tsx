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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SectionSelector (Plan 089 M6)', () => {
  it('renders three section buttons', () => {
    render(<SectionSelector selectedSection="food" onSectionChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /food/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ummah/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /business/i })).toBeInTheDocument();
  });

  it('marks the active section with aria-selected=true', () => {
    render(<SectionSelector selectedSection="ummah" onSectionChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /ummah/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /food/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /business/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSectionChange with food when food button is clicked', () => {
    const onSectionChange = vi.fn();
    render(<SectionSelector selectedSection="ummah" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /food/i }));
    expect(onSectionChange).toHaveBeenCalledWith('food');
  });

  it('calls onSectionChange with business when business button is clicked', () => {
    const onSectionChange = vi.fn();
    render(<SectionSelector selectedSection="food" onSectionChange={onSectionChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /business/i }));
    expect(onSectionChange).toHaveBeenCalledWith('business');
  });
});
