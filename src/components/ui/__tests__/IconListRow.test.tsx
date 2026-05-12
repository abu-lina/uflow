import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { IconListRow } from '@/components/ui/IconListRow';

describe('IconListRow', () => {
  it('renders icon, content, and trailing slots', () => {
    render(
      <IconListRow
        className="px-2 py-2"
        icon={<span data-testid="row-icon">I</span>}
        trailing={<span data-testid="row-trailing">T</span>}
      >
        <span>Row content</span>
      </IconListRow>,
    );

    expect(screen.getByTestId('row-icon')).toBeInTheDocument();
    expect(screen.getByText('Row content')).toBeInTheDocument();
    expect(screen.getByTestId('row-trailing')).toBeInTheDocument();
  });
});
