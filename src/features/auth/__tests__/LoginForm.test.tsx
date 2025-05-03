import React from 'react';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/test-utils';
import { supabase } from '@/lib/supabase/client';

import { LoginForm } from '../ui/LoginForm';

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    renderWithProviders(<LoginForm />);
  });

  it('renders email and password inputs', () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('handles form submission', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    supabase.auth.signInWithPassword = mockSignIn;

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
