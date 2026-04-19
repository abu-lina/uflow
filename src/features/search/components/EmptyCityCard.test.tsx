import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmptyCityCard } from './EmptyCityCard';

// Mock the LanguageProvider
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'suchen.notifyMe': 'Notify me',
        'suchen.notifyMeSuccess': `Done! We'll let you know when ${params?.city} goes live.`,
        'suchen.notifyMeError': 'Something went wrong. Please try again.',
        'suchen.notifyMeEmailPlaceholder': 'Your email address',
        'suchen.notifyMeCityUnavailable': `No providers in ${params?.city} yet – we're working on it.`,
        'suchen.providerCTA': 'Are you a provider? Add your listing →',
        'common.loading': 'Loading',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

describe('EmptyCityCard (Plan 093 M1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authenticated user flow', () => {
    it('should render one-tap notify button for authenticated users', () => {
      render(<EmptyCityCard cityName="Frankfurt" userEmail="user@example.com" />);

      // Should show unavailability message
      expect(screen.getByText(/No providers in Frankfurt yet/)).toBeInTheDocument();

      // Should show notify button, not email input
      expect(screen.getByRole('button', { name: /Notify me/i })).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Your email address')).not.toBeInTheDocument();
    });

    it('should submit city interest without email for authenticated users', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, city: 'Berlin' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Berlin" userEmail="auth@example.com" />);

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/city-interest/subscribe',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cityName: 'Berlin' }),
          })
        );
      });
    });

    it('should show success state after successful submission', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, city: 'Munich' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Munich" userEmail="user@example.com" />);

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Done! We'll let you know when Munich goes live/)).toBeInTheDocument();
      });
    });

    it('should show error state after failed submission', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Hamburg" userEmail="user@example.com" />);

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('Anonymous user flow', () => {
    it('should render email input and button for anonymous users', () => {
      render(<EmptyCityCard cityName="Cologne" userEmail={null} />);

      // Should show email input
      expect(screen.getByPlaceholderText('Your email address')).toBeInTheDocument();

      // Should show notify button
      expect(screen.getByRole('button', { name: /Notify me/i })).toBeInTheDocument();
    });

    it('should disable button when email is empty', () => {
      render(<EmptyCityCard cityName="Stuttgart" userEmail={null} />);

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      expect(notifyButton).toBeDisabled();
    });

    it('should enable button when email is entered', () => {
      render(<EmptyCityCard cityName="Dresden" userEmail={null} />);

      const emailInput = screen.getByPlaceholderText('Your email address');
      const notifyButton = screen.getByRole('button', { name: /Notify me/i });

      fireEvent.change(emailInput, { target: { value: 'anon@example.com' } });

      expect(notifyButton).not.toBeDisabled();
    });

    it('should submit city interest with email for anonymous users', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, city: 'Leipzig' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Leipzig" userEmail={null} />);

      const emailInput = screen.getByPlaceholderText('Your email address');
      fireEvent.change(emailInput, { target: { value: 'anon@example.com' } });

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/city-interest/subscribe',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ cityName: 'Leipzig', email: 'anon@example.com' }),
          })
        );
      });
    });

    it('should clear email field on successful submission', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, city: 'Nuremberg' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Nuremberg" userEmail={null} />);

      const emailInput = screen.getByPlaceholderText('Your email address') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        expect(screen.getByText(/Done! We'll let you know when Nuremberg goes live/)).toBeInTheDocument();
      });

      // Note: success state replaces the form, so email input won't exist anymore
      expect(screen.queryByPlaceholderText('Your email address')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<EmptyCityCard cityName="Essen" userEmail={null} />);

      expect(screen.getByLabelText('Your email address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Notify me/i })).toBeInTheDocument();
    });

    it('should announce success state with aria-live', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, city: 'Dortmund' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Dortmund" userEmail="user@example.com" />);

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        const successElement = screen.getByRole('status');
        expect(successElement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should announce error state with aria-live', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Failed' }),
        } as Response)
      );
      global.fetch = mockFetch as any;

      render(<EmptyCityCard cityName="Düsseldorf" userEmail="user@example.com" />);

      const notifyButton = screen.getByRole('button', { name: /Notify me/i });
      fireEvent.click(notifyButton);

      await waitFor(() => {
        const errorElement = screen.getByRole('alert');
        expect(errorElement).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('Provider CTA', () => {
    it('should render provider link pointing to /recommend', () => {
      render(<EmptyCityCard cityName="Bonn" userEmail={null} />);

      const providerLink = screen.getByText('Are you a provider? Add your listing →');
      expect(providerLink).toBeInTheDocument();
      expect(providerLink.closest('a')).toHaveAttribute('href', '/recommend');
    });
  });

  describe('RTL support', () => {
    it('should have dir="auto" for RTL language support', () => {
      const { container } = render(<EmptyCityCard cityName="Test" userEmail={null} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('dir', 'auto');
    });
  });
});
