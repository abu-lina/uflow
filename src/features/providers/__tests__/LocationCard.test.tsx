import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/__tests__/utils/test-utils';
import { LocationCard } from '@/features/providers/components/LocationCard';
import type { Location } from '@/types/location';

describe('LocationCard', () => {
  const mockLocation: Location = {
    location_id: 'loc-1',
    provider_id: 'prov-1',
    location_name: 'Berlin Mitte',
    address_street: 'Hauptstr 1',
    address_zip: '10115',
    address_city: 'Berlin',
    address_country: 'DE',
    location_latitude: 52.52,
    location_longitude: 13.405,
    opening_hours: null,
    show_address: true,
    contact_phone: null,
    is_primary: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  it('renders location name when available', () => {
    render(<LocationCard location={mockLocation} />);
    expect(screen.getByText('Berlin Mitte')).toBeInTheDocument();
  });

  it('renders formatted address', () => {
    render(<LocationCard location={mockLocation} />);
    expect(screen.getByText(/Hauptstr 1/)).toBeInTheDocument();
    expect(screen.getByText(/10115 Berlin/)).toBeInTheDocument();
  });

  it('shows primary badge when is_primary is true', () => {
    render(<LocationCard location={mockLocation} />);
    expect(screen.getByText('Hauptstandort')).toBeInTheDocument();
  });

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(<LocationCard location={mockLocation} isSelected={true} />);
    const button = container.querySelector('button');
    expect(button?.className).toContain('border-primary');
  });

  it('renders maps link with correct URL', () => {
    render(<LocationCard location={mockLocation} />);
    const mapsLink = screen.getByTitle('In Maps öffnen');
    expect(mapsLink).toBeInTheDocument();
    expect(mapsLink).toHaveAttribute('href', expect.stringContaining('google.com/maps'));
  });

  it('renders without name when location_name is null', () => {
    const loc = { ...mockLocation, location_name: null };
    render(<LocationCard location={loc} />);
    expect(screen.queryByText('Berlin Mitte')).not.toBeInTheDocument();
    expect(screen.getByText(/Hauptstr 1/)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<LocationCard location={mockLocation} onSelect={onSelect} />);
    screen.getByText('Berlin Mitte').closest('button')?.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
