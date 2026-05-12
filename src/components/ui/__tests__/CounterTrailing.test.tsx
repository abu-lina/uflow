import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CounterTrailing } from '@/components/ui/CounterTrailing';

describe('CounterTrailing', () => {
  it('renders value and triggers increment/decrement handlers', () => {
    const onIncrement = vi.fn();
    const onDecrement = vi.fn();

    render(
      <CounterTrailing
        decrementAriaLabel="decrement"
        incrementAriaLabel="increment"
        value={2}
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />,
    );

    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /decrement/i }));
    fireEvent.click(screen.getByRole('button', { name: /increment/i }));

    expect(onDecrement).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('disables decrement at min and increment at max', () => {
    render(
      <CounterTrailing
        decrementAriaLabel="decrement"
        incrementAriaLabel="increment"
        value={0}
        min={0}
        max={0}
        onIncrement={() => {}}
        onDecrement={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /decrement/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /increment/i })).toBeDisabled();
  });
});
