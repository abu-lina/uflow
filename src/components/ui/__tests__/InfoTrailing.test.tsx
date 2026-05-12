import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InfoTrailing } from '@/components/ui/InfoTrailing';

describe('InfoTrailing', () => {
  it('renders button and calls onPress when handler is provided', () => {
    const onPress = vi.fn();

    render(<InfoTrailing ariaLabel="info action" onPress={onPress} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders decorative span when no handler is provided', () => {
    render(<InfoTrailing />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    const iconWrapper = screen.getByTestId('info-trailing-static');
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
  });
});
