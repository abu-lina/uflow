import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';

import { render } from '../utils/test-utils';
import { HalalTrustPopup } from '@/features/providers/components/HalalTrustPopup';

describe('HalalTrustPopup accessibility', () => {
  it('[pre-fix FAILS] removes placeholder halal icon label text', () => {
    localStorage.setItem('preferred-language', 'en');
    render(<HalalTrustPopup isOpen onClose={vi.fn()} />);

    expect(screen.queryByText(/halal\s*trust/i)).not.toBeInTheDocument();
    expect(screen.getByText('حلال')).toBeInTheDocument();
  });

  it('[post-review fix] traps focus with tab and shift+tab', () => {
    localStorage.setItem('preferred-language', 'en');
    render(<HalalTrustPopup isOpen onClose={vi.fn()} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    const moreLink = screen.getByRole('link', { name: /learn more/i });

    moreLink.focus();
    fireEvent.keyDown(moreLink, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(moreLink);
  });
});
