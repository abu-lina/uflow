import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrayerRug } from './PrayerRug';

describe('PrayerRug', () => {
  it('renders a 24x24 svg by default and forwards className', () => {
    const { container } = render(<PrayerRug className="icon-class" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveClass('icon-class');
  });
});
