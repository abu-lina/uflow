import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AdminStatusFilter, type ReviewStatusFilter } from '../AdminStatusFilter';

/**
 * Tests for AdminStatusFilter component (Plan 058 M2)
 * 
 * This component provides admin-only status filtering on the /providers page
 */
describe('AdminStatusFilter', () => {
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all status filter tabs', () => {
    render(
      <AdminStatusFilter
        selectedStatus={null}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Should show all filter options
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /approved/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /rejected/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /needs.*revision/i })).toBeInTheDocument();
  });

  it('should highlight the selected status tab', () => {
    render(
      <AdminStatusFilter
        selectedStatus="pending"
        onStatusChange={mockOnStatusChange}
      />
    );

    const pendingTab = screen.getByRole('tab', { name: /pending/i });
    expect(pendingTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should call onStatusChange when a status tab is clicked', () => {
    render(
      <AdminStatusFilter
        selectedStatus={null}
        onStatusChange={mockOnStatusChange}
      />
    );

    const approvedTab = screen.getByRole('tab', { name: /approved/i });
    fireEvent.click(approvedTab);

    expect(mockOnStatusChange).toHaveBeenCalledWith('approved');
  });

  it('should call onStatusChange with null when "All" tab is clicked', () => {
    render(
      <AdminStatusFilter
        selectedStatus="pending"
        onStatusChange={mockOnStatusChange}
      />
    );

    const allTab = screen.getByRole('tab', { name: /all/i });
    fireEvent.click(allTab);

    expect(mockOnStatusChange).toHaveBeenCalledWith(null);
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <AdminStatusFilter
        selectedStatus="approved"
        onStatusChange={mockOnStatusChange}
      />
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', expect.stringMatching(/filter.*status/i));
  });

  it('should support keyboard navigation with Enter key', () => {
    render(
      <AdminStatusFilter
        selectedStatus={null}
        onStatusChange={mockOnStatusChange}
      />
    );

    const rejectedTab = screen.getByRole('tab', { name: /rejected/i });
    fireEvent.keyDown(rejectedTab, { key: 'Enter' });

    expect(mockOnStatusChange).toHaveBeenCalledWith('rejected');
  });

  it('should support keyboard navigation with Space key', () => {
    render(
      <AdminStatusFilter
        selectedStatus={null}
        onStatusChange={mockOnStatusChange}
      />
    );

    const needsRevisionTab = screen.getByRole('tab', { name: /needs.*revision/i });
    fireEvent.keyDown(needsRevisionTab, { key: ' ' });

    expect(mockOnStatusChange).toHaveBeenCalledWith('needs_revision');
  });

  it('should show "All" as selected when selectedStatus is null', () => {
    render(
      <AdminStatusFilter
        selectedStatus={null}
        onStatusChange={mockOnStatusChange}
      />
    );

    const allTab = screen.getByRole('tab', { name: /all/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
  });
});
