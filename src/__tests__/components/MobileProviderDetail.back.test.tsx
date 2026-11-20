// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { MobileProviderDetail } from '@/features/providers/components/MobileProviderDetail';
import { mockProviders } from '../mocks/providerData';

describe('MobileProviderDetail back chevron (#986)', () => {
  beforeEach(() => {
    localStorage.setItem('preferred-language', 'de');
  });

  it('has an accessible name, a focus-visible ring and a 40px target', () => {
    render(<MobileProviderDetail provider={mockProviders[0]} />);

    const button = screen.getByRole('button', { name: 'Zurück' });

    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('size-10');
  });

  it('calls onBack when given', () => {
    const onBack = vi.fn();
    render(<MobileProviderDetail provider={mockProviders[0]} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

    expect(onBack).toHaveBeenCalled();
  });
});
