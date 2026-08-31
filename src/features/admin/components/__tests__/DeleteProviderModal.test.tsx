import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { DeleteProviderModal } from '../DeleteProviderModal';

describe('DeleteProviderModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <DeleteProviderModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText(/delete provider/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <DeleteProviderModal
        isOpen={false}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText(/delete provider/i)).not.toBeInTheDocument();
  });

  it('should show the provider name', () => {
    render(
      <DeleteProviderModal
        isOpen={true}
        providerName="Amazing Bakery"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText(/Amazing Bakery/i)).toBeInTheDocument();
  });

  it('should show the irreversibility warning', () => {
    render(
      <DeleteProviderModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
  });

  it('should call onConfirm when delete button is clicked', () => {
    render(
      <DeleteProviderModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <DeleteProviderModal
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
      <DeleteProviderModal
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable buttons when loading', () => {
    render(
      <DeleteProviderModal
        isLoading={true}
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /deleting/i });
    expect(deleteButton).toBeDisabled();

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  it('should show "Deleting..." text when loading', () => {
    render(
      <DeleteProviderModal
        isLoading={true}
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });

  it('should have accessible dialog with proper ARIA attributes', () => {
    render(
      <DeleteProviderModal
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

  it('should not call onConfirm when buttons are loading and clicked', () => {
    render(
      <DeleteProviderModal
        isLoading={true}
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /deleting/i });
    fireEvent.click(deleteButton);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should not close on backdrop click when loading', () => {
    render(
      <DeleteProviderModal
        isLoading={true}
        isOpen={true}
        providerName="Test Provider"
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
