import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { WasServiceTypeResults } from './WasServiceTypeResults';

const t = (key: string) => {
  const map: Record<string, string> = {
    'suchen.was.selectionLabel': 'AUSWAHL',
    'suchen.was.removeSelection': 'Auswahl entfernen',
    'suchen.was.ummah.serviceTypeLabel': 'Dienst',
    'suchen.was.ummah.browseServiceTypes': 'Dienste durchsuchen',
    'suchen.was.ummah.items.islamischeBildung': 'Islamische Bildung',
    'suchen.was.ummah.items.beratung': 'Beratung',
    'suchen.was.ummah.items.rechtshilfe': 'Rechtshilfe',
    'suchen.was.ummah.items.jugenddienste': 'Jugenddienste',
    'suchen.was.ummah.items.gesundheitsversorgung': 'Gesundheitsversorgung',
    'suchen.was.ummah.items.eheberatung': 'Eheberatung',
    'suchen.was.ummah.items.bestattungsdienste': 'Bestattungsdienste',
    'suchen.was.ummah.items.sozialeHilfe': 'Soziale Hilfe',
    'suchen.was.ummah.items.sprachkurse': 'Sprachkurse',
    'suchen.was.ummah.items.quranUnterricht': 'Quran-Unterricht',
  };

  return map[key] ?? key;
};

describe('WasServiceTypeResults', () => {
  it('renders all service types when query is empty', () => {
    render(
      <WasServiceTypeResults
        query=""
        selectedServiceType={null}
        t={t}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Islamische Bildung')).toBeInTheDocument();
    expect(screen.getByText('Beratung')).toBeInTheDocument();
    expect(screen.getByText('Quran-Unterricht')).toBeInTheDocument();
  });

  it('filters service types by query', () => {
    render(
      <WasServiceTypeResults
        query="Berat"
        selectedServiceType={null}
        t={t}
        onClearSelection={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('Beratung')).toBeInTheDocument();
    expect(screen.queryByText('Rechtshilfe')).not.toBeInTheDocument();
  });

  it('calls onSelect with service-type payload', () => {
    const onSelect = vi.fn();

    render(
      <WasServiceTypeResults
        query=""
        selectedServiceType={null}
        t={t}
        onClearSelection={vi.fn()}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Beratung$/i }));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Beratung',
        type: 'service-type',
        serviceTypeId: 'beratung',
      }),
    );
  });

  it('renders selected state and clears selection', () => {
    const onClearSelection = vi.fn();

    render(
      <WasServiceTypeResults
        query=""
        selectedServiceType={{
          label: 'Beratung',
          type: 'service-type',
          serviceTypeId: 'beratung',
        }}
        t={t}
        onClearSelection={onClearSelection}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Auswahl entfernen' }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });
});
