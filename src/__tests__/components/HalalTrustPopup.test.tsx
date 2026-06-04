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

  it('[post-fix PASSES] traps focus on close button (only focusable element)', () => {
    localStorage.setItem('preferred-language', 'en');
    render(<HalalTrustPopup isOpen onClose={vi.fn()} />);

    const closeButton = screen.getByRole('button', { name: /close/i });

    // Close button should receive focus when popup opens
    expect(document.activeElement).toBe(closeButton);

    // Tab while on close button keeps focus on close button (only element)
    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: 'Tab' });
    expect(document.activeElement).toBe(closeButton);

    // Shift+Tab while on close button keeps focus on close button
    closeButton.focus();
    fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeButton);
  });
});
