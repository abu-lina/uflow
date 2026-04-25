import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { WerAudienceFilter } from './WerAudienceFilter';

const t = (key: string, variables?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'suchen.wer.maennerLabel': 'Männer',
    'suchen.wer.frauenLabel': 'Frauen',
    'suchen.wer.kinderLabel': 'Kinder',
    'suchen.wer.subtitle': 'Passende Angebote anzeigen',
    'suchen.wer.decrementAriaLabel': `${variables?.audience ?? ''} verringern`,
    'suchen.wer.incrementAriaLabel': `${variables?.audience ?? ''} erhöhen`,
  };

  return map[key] ?? key;
};

describe('WerAudienceFilter (Plan 103)', () => {
  it('renders all three audience rows with subtitle', () => {
    render(<WerAudienceFilter t={t} />);

    expect(screen.getByText('Männer')).toBeInTheDocument();
    expect(screen.getByText('Frauen')).toBeInTheDocument();
    expect(screen.getByText('Kinder')).toBeInTheDocument();
    expect(screen.getAllByText('Passende Angebote anzeigen')).toHaveLength(3);
  });

  it('starts with one selected person and updates counters independently', () => {
    render(<WerAudienceFilter t={t} />);

    const menInc = screen.getByRole('button', { name: 'Männer erhöhen' });
    const menDec = screen.getByRole('button', { name: 'Männer verringern' });
    const womenInc = screen.getByRole('button', { name: 'Frauen erhöhen' });

    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.getAllByText('0')).toHaveLength(2);
    expect(menDec).toBeDisabled();

    fireEvent.click(menInc);
    expect(screen.getAllByText('2')).toHaveLength(1);
    expect(screen.getAllByText('0')).toHaveLength(2);

    fireEvent.click(womenInc);
    expect(screen.getAllByText('2')).toHaveLength(1);
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.getAllByText('0')).toHaveLength(1);

    fireEvent.click(menDec);
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getAllByText('0')).toHaveLength(1);
  });

  it('keeps at least one selected person and supports double-digit counts without truncating value', () => {
    render(<WerAudienceFilter t={t} />);

    const childDec = screen.getByRole('button', { name: 'Kinder verringern' });
    const childInc = screen.getByRole('button', { name: 'Kinder erhöhen' });

    fireEvent.click(childDec);
    expect(screen.getAllByText('1')).toHaveLength(1);
    expect(screen.getAllByText('0')).toHaveLength(2);

    for (let i = 0; i < 10; i += 1) {
      fireEvent.click(childInc);
    }

    expect(screen.getByText('10')).toBeInTheDocument();

    const menDec = screen.getByRole('button', { name: 'Männer verringern' });
    fireEvent.click(menDec);
    expect(screen.getAllByText('0')).toHaveLength(2);
  });
});
