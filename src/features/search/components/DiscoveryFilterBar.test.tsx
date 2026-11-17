// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscoveryFilterBar } from './DiscoveryFilterBar';

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'suchen.nearMe.chipLabel': 'Near me',
        'suchen.openNow.chipLabel': 'Open now',
        'search.everywhere': 'Everywhere',
        'suchen.accordions.wo': 'Wo',
        'suchen.tierFilter.chipLabel': 'Halal Level',
        'suchen.tierFilter.bronze': 'Bronze+',
        'suchen.tierFilter.silver': 'Silver+',
        'suchen.tierFilter.gold': 'Gold',
        'suchen.tierFilter.all': 'All',
      };
      return map[key] ?? key;
    },
    language: 'en',
  }),
}));

const baseProps = {
  geoStatus: 'idle' as const,
  nearMeActive: false,
  openNowActive: false,
  onToggleNearMe: vi.fn(),
  onToggleOpenNow: vi.fn(),
};

describe('DiscoveryFilterBar location chip', () => {
  it('renders the chip first in the row with the city label', () => {
    render(
      <DiscoveryFilterBar {...baseProps} locationCity="Stuttgart" onLocationClick={vi.fn()} />,
    );
    const chip = screen.getByRole('button', { name: 'Wo: Stuttgart' });
    const row = chip.parentElement;
    expect(row?.firstElementChild).toBe(chip);
    expect(screen.getByText('Stuttgart')).toBeInTheDocument();
  });

  it('shows Everywhere when locationCity is null', () => {
    render(<DiscoveryFilterBar {...baseProps} locationCity={null} onLocationClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Wo: Everywhere' })).toBeInTheDocument();
  });

  it('shows Everywhere when locationCity is an empty string', () => {
    render(<DiscoveryFilterBar {...baseProps} locationCity="" onLocationClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Wo: Everywhere' })).toBeInTheDocument();
  });

  it('calls onLocationClick on tap and has no aria-pressed', () => {
    const onLocationClick = vi.fn();
    render(
      <DiscoveryFilterBar {...baseProps} locationCity="Berlin" onLocationClick={onLocationClick} />,
    );
    const chip = screen.getByRole('button', { name: 'Wo: Berlin' });
    expect(chip).not.toHaveAttribute('aria-pressed');
    fireEvent.click(chip);
    expect(onLocationClick).toHaveBeenCalledTimes(1);
  });

  it('hides the chip while the Near Me chip is active', () => {
    render(
      <DiscoveryFilterBar
        {...baseProps}
        geoStatus="granted"
        nearMeActive
        locationCity="Stuttgart"
        onLocationClick={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Wo:/ })).not.toBeInTheDocument();
  });

  it('does not render the chip at all when onLocationClick is omitted (home case)', () => {
    render(<DiscoveryFilterBar {...baseProps} locationCity="Stuttgart" />);
    expect(screen.queryByRole('button', { name: /Wo:/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Near me' })).toBeInTheDocument();
  });
});

describe('DiscoveryFilterBar halal tier chip', () => {
  it('renders the Halal Level chip when no tier is active', () => {
    render(<DiscoveryFilterBar {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Halal Level' })).toBeInTheDocument();
  });

  it('shows the active tier label in the chip when a tier is selected', () => {
    render(<DiscoveryFilterBar {...baseProps} activeTier="silver" />);
    expect(screen.getByRole('button', { name: 'Silver+' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Halal Level' })).not.toBeInTheDocument();
  });

  it('marks the tier chip aria-pressed true when a tier is active', () => {
    render(<DiscoveryFilterBar {...baseProps} activeTier="gold" />);
    const chip = screen.getByRole('button', { name: 'Gold' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the tier chip aria-pressed false when no tier is active', () => {
    render(<DiscoveryFilterBar {...baseProps} />);
    const chip = screen.getByRole('button', { name: 'Halal Level' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onTierChange when tier chip is clicked', () => {
    const onTierChange = vi.fn();
    render(<DiscoveryFilterBar {...baseProps} onTierChange={onTierChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Halal Level' }));
    expect(onTierChange).toHaveBeenCalledTimes(1);
  });
});
