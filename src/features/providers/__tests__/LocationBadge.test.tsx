import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/__tests__/utils/test-utils';
import { LocationBadge } from '@/features/providers/components/LocationBadge';

describe('LocationBadge', () => {
  it('renders "N Standorte" when count > 1', () => {
    render(<LocationBadge count={3} providerId="prov-1" />);
    expect(screen.getByText('3 Standorte')).toBeInTheDocument();
  });

  it('renders nothing when count is 1', () => {
    const { container } = render(<LocationBadge count={1} providerId="prov-1" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when count is 0', () => {
    const { container } = render(<LocationBadge count={0} providerId="prov-1" />);
    expect(container.innerHTML).toBe('');
  });

  it('links to provider detail page with locations anchor', () => {
    render(<LocationBadge count={2} providerId="prov-123" />);
    const link = screen.getByText('2 Standorte').closest('a');
    expect(link).toHaveAttribute('href', '/providers/prov-123#locations');
  });
});
