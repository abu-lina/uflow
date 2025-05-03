import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/test-utils';
import { supabase } from '@/lib/supabase/client';

import { LoginForm } from '../ui/LoginForm';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        callback('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

// Mock zod
vi.mock('zod', () => {
  const schema = {
    parse: vi.fn().mockReturnValue({ email: 'test@example.com', password: 'password123' }),
    shape: {
      email: { parse: vi.fn() },
      password: { parse: vi.fn() },
    },
    extend: vi.fn().mockReturnValue({
      refine: vi.fn().mockReturnValue({
        parse: vi.fn(),
      }),
    }),
  };

  return {
    z: {
      object: () => schema,
      string: () => ({
        email: () => ({
          parse: vi.fn(),
        }),
        min: () => ({
          max: () => ({
            parse: vi.fn(),
          }),
        }),
      }),
    },
  };
});

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs', async () => {
    await renderWithProviders(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn);

    await renderWithProviders(<LoginForm />);
    
    const user = userEvent.setup();
    
    // Type in the form fields
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Wait for the submission to complete
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
