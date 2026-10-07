// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

  // #562 Code Review 2: an unfocused barrier is not a barrier for
  // assistive-tech users — and this dialog is the only guard on an
  // irreversible public publish. Focus must enter it, stay trapped in it,
  // and return to the trigger on close.
  describe('focus management (#562)', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            open approve
          </button>
          <ApproveModal
            isOpen={open}
            providerName="Test Provider"
            onClose={() => setOpen(false)}
            onConfirm={mockOnConfirm}
          />
        </>
      );
    }

    it('describes the consequence via aria-describedby', () => {
      render(
        <ApproveModal
          isOpen={true}
          providerName="Test Provider"
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />,
      );

      const dialog = screen.getByRole('dialog');
      const descId = dialog.getAttribute('aria-describedby');
      expect(descId).toBeTruthy();
      expect(document.getElementById(descId as string)).toHaveTextContent(/approveConfirm\.body/);
    });

    it('moves focus into the dialog on open', async () => {
      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'open approve' });
      trigger.focus();
      fireEvent.click(trigger);

      const dialog = await screen.findByRole('dialog');
      await waitFor(() => {
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    });

    it('traps Tab inside the dialog', async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole('button', { name: 'open approve' }));
      await screen.findByRole('dialog');

      const cancel = screen.getByRole('button', { name: 'common.cancel' });
      const confirm = screen.getByRole('button', {
        name: 'adminHalalEdit.review.approveConfirm.confirm',
      });

      // Tab on the last control wraps to the first; Shift+Tab on the first
      // wraps to the last — focus cannot leave the barrier.
      confirm.focus();
      fireEvent.keyDown(confirm, { key: 'Tab' });
      expect(document.activeElement).toBe(cancel);

      fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(confirm);
    });

    it('Escape closes and focus returns to the trigger', async () => {
      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'open approve' });
      trigger.focus();
      fireEvent.click(trigger);
      await screen.findByRole('dialog');

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(document.activeElement).toBe(trigger);
    });
  });
});
