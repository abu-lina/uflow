/**
 * Tests for Owner Decision Landing Page
 * Plan 038: Provider Owner Outreach & Claim System
 *
 * TDD: These tests are written BEFORE implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Mock outreach service
vi.mock('@/services/outreach', () => ({
  validateOutreachToken: vi.fn(),
  hashToken: vi.fn((t) => `hashed-${t}`),
}));

import { useSearchParams, useRouter } from 'next/navigation';
import { validateOutreachToken } from '@/services/outreach';

import { OwnerDecisionContent } from '@/app/(public)/owner-decision/OwnerDecisionContent';

describe('OwnerDecisionContent', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it('shows loading state initially', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    expect(screen.getByText(/laden|loading/i)).toBeInTheDocument();
  });

  it('shows error for missing token', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as never);

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByText(/ungültig|invalid|fehlt|missing/i)).toBeInTheDocument();
    });
  });

  it('shows error for invalid token', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('invalid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: false,
      errorMessage: 'Token expired',
    });

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /ungültig|invalid/i })).toBeInTheDocument();
    });
  });

  it('displays provider name and options for valid token', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: true,
      providerId: 'provider-123',
      providerName: 'Test Business',
      actionScope: 'decision',
    });

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    // Should show three action options
    expect(
      screen.getByRole('button', { name: /gelistet bleiben|stay listed/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /beanspruchen|claim/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entfernen|remove/i })).toBeInTheDocument();
  });

  it('hides WhatsApp footer when whatsappUrl is null', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: true,
      providerId: 'provider-123',
      providerName: 'Test Business',
      actionScope: 'decision',
    });

    render(<OwnerDecisionContent whatsappUrl={null} />);

    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    expect(screen.queryByText(/WhatsApp öffnen/i)).not.toBeInTheDocument();
  });

  it('handles "stay listed" action', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: true,
      providerId: 'provider-123',
      providerName: 'Test Business',
      actionScope: 'decision',
    });

    // Mock fetch for action API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    const stayButton = screen.getByRole('button', { name: /gelistet bleiben|stay listed/i });
    fireEvent.click(stayButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/outreach/action'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('keep'),
        }),
      );
    });
  });

  it('handles "claim" action by redirecting to signup', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: true,
      providerId: 'provider-123',
      providerName: 'Test Business',
      actionScope: 'decision',
    });

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    const claimButton = screen.getByRole('button', { name: /beanspruchen|claim/i });
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/signup|login/));
    });
  });

  it('handles "remove" action', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: true,
      providerId: 'provider-123',
      providerName: 'Test Business',
      actionScope: 'decision',
    });

    // Mock fetch for action API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: /entfernen|remove/i });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/outreach/action'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('remove'),
        }),
      );
    });
  });

  it('shows success message after action completes', async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue('valid-token'),
    } as never);
    vi.mocked(validateOutreachToken).mockResolvedValue({
      isValid: true,
      providerId: 'provider-123',
      providerName: 'Test Business',
      actionScope: 'decision',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<OwnerDecisionContent whatsappUrl="https://wa.me/4915123456789" />);

    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });

    const stayButton = screen.getByRole('button', { name: /gelistet bleiben|stay listed/i });
    fireEvent.click(stayButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dank|thank/i })).toBeInTheDocument();
    });
  });
});
