import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { RejectModal } from '../RejectModal';

/**
 * Tests for RejectModal component (Plan 059/062)
 * 
 * Modal/popover for rejecting a provider with REQUIRED feedback
 * Plan 059/062: Rejection requires a non-empty feedback reason
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

  it('should have a required feedback textarea with aria-required', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-required', 'true');
    expect(screen.getByPlaceholderText(/reason/i)).toBeInTheDocument();
  });

  it('should have confirm button disabled when textarea is empty (Plan 059/062)', async () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm.*reject/i });
    expect(confirmButton).toBeDisabled();
    
    // Clicking disabled button should not call onConfirm
    fireEvent.click(confirmButton);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should enable confirm button when valid feedback is entered (Plan 059/062)', async () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const textarea = screen.getByRole('textbox');
    const confirmButton = screen.getByRole('button', { name: /confirm.*reject/i });
    
    // Initially disabled
    expect(confirmButton).toBeDisabled();
    
    // Enter valid feedback
    fireEvent.change(textarea, { target: { value: 'Does not meet community guidelines' } });
    
    // Should now be enabled
    expect(confirmButton).not.toBeDisabled();
  });

  it('should keep confirm button disabled for whitespace-only feedback (Plan 059/062)', async () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const textarea = screen.getByRole('textbox');
    const confirmButton = screen.getByRole('button', { name: /confirm.*reject/i });
    
    // Enter whitespace-only feedback
    fireEvent.change(textarea, { target: { value: '   \n\t  ' } });
    
    // Should still be disabled
    expect(confirmButton).toBeDisabled();
  });

  it('should call onConfirm with trimmed feedback when provided', async () => {
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

  it('should show required indicator for rejection reason (Plan 059/062)', () => {
    render(
      <RejectModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Should show "Rejection Reason" label with required indicator
    expect(screen.getByText(/rejection reason/i)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
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
