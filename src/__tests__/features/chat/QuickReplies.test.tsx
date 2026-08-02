import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickReplies } from '@/features/chat/components/QuickReplies';

describe('QuickReplies', () => {
  it('single-select: calls onSelect immediately with the option text', () => {
    const onSelect = vi.fn();
    render(
      <QuickReplies options={['Ja', 'Nein']} onSelect={onSelect} singleSelect />,
    );
    fireEvent.click(screen.getByText('Ja'));
    expect(onSelect).toHaveBeenCalledWith('Ja');
  });

  it('multi-select: renders confirm button after selection', () => {
    const onSelect = vi.fn();
    render(
      <QuickReplies
        options={['Muslimisch geführt', 'Gebetsraum', 'Familienfreundlich']}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText('Muslimisch geführt'));
    expect(screen.getByText(/Bestätigen/i)).toBeInTheDocument();
  });

  it('[post-fix PASSES] multi-select confirmation sends comma-joined items WITHOUT machine artifact prefix', () => {
    const onSelect = vi.fn();
    render(
      <QuickReplies
        options={['Muslimisch geführt', 'Gebetsraum', 'Familienfreundlich']}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Muslimisch geführt'));
    fireEvent.click(screen.getByText('Gebetsraum'));
    fireEvent.click(screen.getByText(/Bestätigen/i));

    expect(onSelect).toHaveBeenCalledOnce();
    const sent = onSelect.mock.calls[0][0] as string;
    expect(sent).toBe('Muslimisch geführt, Gebetsraum');
    expect(sent).not.toContain('Folgendes trifft zu:');
  });

  it('[post-fix PASSES] single-item multi-select confirmation sends the item without any prefix', () => {
    const onSelect = vi.fn();
    render(
      <QuickReplies
        options={['Muslimisch geführt', 'Gebetsraum', 'Familienfreundlich']}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByText('Gebetsraum'));
    fireEvent.click(screen.getByText(/Bestätigen/i));

    const sent = onSelect.mock.calls[0][0] as string;
    expect(sent).toBe('Gebetsraum');
    expect(sent).not.toContain('Folgendes trifft zu:');
  });
});
