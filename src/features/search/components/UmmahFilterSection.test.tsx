import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UmmahFilterSection } from './UmmahFilterSection';

let enableSearchExpandShowAllPreview = false;

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: (key: string) => {
    if (key === 'enableSearchExpandShowAllPreview') {
      return enableSearchExpandShowAllPreview;
    }
    return false;
  },
}));

const t = (key: string) => {
  const map: Record<string, string> = {
    'suchen.filter.ummahItems.kostenlos.title': 'Kostenlos',
    'suchen.filter.ummahItems.kostenlos.subtitle': 'Kostenfreies Angebot',
    'suchen.filter.ummahItems.online.title': 'Online verfügbar',
    'suchen.filter.ummahItems.online.subtitle': 'Fernberatung möglich',
    'suchen.filter.ummahItems.sprache.title': 'Mehrsprachig',
    'suchen.filter.ummahItems.sprache.subtitle': 'Arabisch, Türkisch, Urdu u.v.m.',
    'suchen.filter.ummahItems.zertifiziert.title': 'Zertifiziert',
    'suchen.filter.ummahItems.zertifiziert.subtitle': 'Anerkannte Qualifikation',
    'suchen.filter.ummahItems.geschlechtergetrennt.title': 'Geschlechtergetrennt',
    'suchen.filter.ummahItems.geschlechtergetrennt.subtitle': 'Separate Bereiche für Männer & Frauen',
    'suchen.filter.showAllFilters': 'Show all filters',
  };

  return map[key] ?? key;
};

describe('UmmahFilterSection', () => {
  it('renders max 3 ummah-specific filters by default', () => {
    render(
      <UmmahFilterSection
        selectedFilters={[]}
        t={t}
        onToggleFilter={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /Kostenlos/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Online verfügbar/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Mehrsprachig/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Zertifiziert/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Geschlechtergetrennt/i })).not.toBeInTheDocument();
  });

  it('toggles by ummah filter key', () => {
    const onToggleFilter = vi.fn();

    render(
      <UmmahFilterSection
        selectedFilters={[]}
        t={t}
        onToggleFilter={onToggleFilter}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /Kostenlos/i }));
    expect(onToggleFilter).toHaveBeenCalledWith('kostenlos');
  });

  it('marks selected filter with aria-checked', () => {
    render(
      <UmmahFilterSection
        selectedFilters={['kostenlos']}
        t={t}
        onToggleFilter={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /Kostenlos/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows all ummah filters when show-all preview flag is enabled', () => {
    enableSearchExpandShowAllPreview = true;

    render(
      <UmmahFilterSection
        selectedFilters={[]}
        t={t}
        onToggleFilter={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show all filters' }));

    expect(screen.getByRole('checkbox', { name: /Zertifiziert/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Geschlechtergetrennt/i })).toBeInTheDocument();
  });
});
