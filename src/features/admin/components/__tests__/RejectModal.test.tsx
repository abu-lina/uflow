import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { RejectModal } from '../RejectModal';

/**
 * Tests for RejectModal component (Plan 058 M3)
 * 
 * Modal/popover for rejecting a provider with optional feedback
 */
describe('RejectModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText(/reject.*provider/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <RejectModal
        isOpen={false}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText(/reject.*provider/i)).not.toBeInTheDocument();
  });

  it('should show the provider name', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Amazing Bakery"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText(/Amazing Bakery/i)).toBeInTheDocument();
  });

  it('should have an optional feedback textarea', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/feedback|reason|comment/i)).toBeInTheDocument();
  });

  it('should call onConfirm without feedback when confirmed with empty textarea', async () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm.*reject/i });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith(undefined);
  });

  it('should call onConfirm with feedback when provided', async () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Does not meet community guidelines' } });

    const confirmButton = screen.getByRole('button', { name: /confirm.*reject/i });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledWith('Does not meet community guidelines');
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('should show loading state when isLoading is true', () => {
    render(
      <RejectModal
        isLoading={true}
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm.*reject|rejecting/i });
    expect(confirmButton).toBeDisabled();
  });

  it('should clear feedback when modal closes and reopens', async () => {
    const { rerender } = render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Type some feedback
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Some feedback' } });
    expect(textarea).toHaveValue('Some feedback');

    // Close modal
    rerender(
      <RejectModal
        isOpen={false}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Reopen modal
    rerender(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Textarea should be empty
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});
