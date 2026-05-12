import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RowItem } from '@/components/ui/RowItem';

describe('RowItem', () => {
  it('renders as button when selectable and fires onSelect', () => {
    const onSelect = vi.fn();

    render(
      <RowItem
        selectable
        className="px-2 py-2"
        icon={<span data-testid="row-icon">I</span>}
        subtitle="Subtitle"
        title="Title"
        onSelect={onSelect}
      />,
    );

    const button = screen.getByRole('button', { name: /title/i });
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('renders as div when selectable is false', () => {
    const { container } = render(
      <RowItem
        icon={<span data-testid="row-icon">I</span>}
        subtitle="Subtitle"
        title="Static"
      />,
    );

    expect(screen.queryByRole('button', { name: /static/i })).not.toBeInTheDocument();
    expect(container.querySelector('div')).not.toBeNull();
  });

  it('renders selected multiselect state with checkbox semantics', () => {
    render(
      <RowItem
        selectable
        multiSelect
        selected
        icon={<span data-testid="row-icon">I</span>}
        title="Multi"
        onSelect={() => {}}
      />,
    );

    const checkboxRow = screen.getByRole('checkbox', { name: /multi/i });
    expect(checkboxRow).toHaveAttribute('aria-checked', 'true');
  });

  it('renders trailing content', () => {
    render(
      <RowItem
        icon={<span data-testid="row-icon">I</span>}
        title="With trailing"
        trailing={<span data-testid="row-trailing">T</span>}
      />,
    );

    expect(screen.getByTestId('row-trailing')).toBeInTheDocument();
  });
});
