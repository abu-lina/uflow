// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ApproveModal } from '../ApproveModal';

// Same key-echoing t() as the page-level test: assertions pin WHICH key is
// rendered, not the literal copy — the catalogue text itself is covered by
// halal-attestation-parity.test.ts.
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key} ${JSON.stringify(vars)}` : key,
  }),
}));

/**
 * #548 design fixes: Approve publishes publicly and irreversibly, so it gets
 * the same guarded-confirm treatment Reject already had — same modal
 * structure, same dismiss semantics, consequence named in the body copy.
 */
describe('ApproveModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a dialog when open', () => {
    render(
      <ApproveModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('does not render when closed', () => {
    render(
      <ApproveModal
        isOpen={false}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the consequence: public immediate publication plus enrichment, with the provider name', () => {
    render(
      <ApproveModal
        isOpen={true}
        providerName="Amazing Bakery"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.getByText('adminHalalEdit.review.approveConfirm.title')).toBeInTheDocument();
    const body = screen.getByText(/adminHalalEdit\.review\.approveConfirm\.body/);
    expect(body.textContent).toContain('Amazing Bakery');
  });

  it('confirm calls onConfirm', () => {
    render(
      <ApproveModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'adminHalalEdit.review.approveConfirm.confirm' }),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancel closes without confirming', () => {
    render(
      <ApproveModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('Escape and backdrop click close without confirming', () => {
    render(
      <ApproveModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();

    // Backdrop is the outer presentation element wrapping the dialog.
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.click(backdrop as Element);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while a request is in flight', () => {
    render(
      <ApproveModal
        isLoading={true}
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />,
    );

    expect(screen.getByRole('button', { name: 'common.cancel' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'adminHalalEdit.review.approveConfirm.confirming' }),
    ).toBeDisabled();
  });
});
