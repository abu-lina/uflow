// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AccountDeleteContent } from './AccountDeleteContent';
import { accountService } from '@/services/account';
import { authService } from '@/features/auth/services/authService';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace, back: vi.fn() }),
}));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/services/account', () => ({
  accountService: { deleteAccount: vi.fn() },
}));
vi.mock('@/features/auth/services/authService', () => ({
  authService: { signOut: vi.fn() },
}));

const user = { id: '11111111-1111-4111-8111-111111111111' } as never;

async function confirmDelete() {
  fireEvent.click(screen.getByRole('button', { name: 'profile.deleteAccountAria' }));
  fireEvent.click(screen.getByRole('button', { name: 'profile.confirmDelete' }));
}

describe('AccountDeleteContent (#1002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(authService.signOut).mockResolvedValue({ error: null } as never);
  });

  it('signs out and redirects home after the account is deleted, keeping the buttons disabled', async () => {
    vi.mocked(accountService.deleteAccount).mockResolvedValue('deleted');
    render(<AccountDeleteContent user={user} />);

    await confirmDelete();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/?auth=required'));
    expect(authService.signOut).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'profile.deleteAccountAria' })).toBeDisabled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the translated error, focused, when deletion fails', async () => {
    vi.mocked(accountService.deleteAccount).mockRejectedValue(
      new Error('Account deletion failed with status 500'),
    );
    render(<AccountDeleteContent user={user} />);

    await confirmDelete();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('profile.errorDeletingAccount');
    expect(alert).not.toHaveTextContent('500');
    expect(alert).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
    expect(authService.signOut).not.toHaveBeenCalled();
  });

  it('shows the translated error when the request itself fails', async () => {
    vi.mocked(accountService.deleteAccount).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AccountDeleteContent user={user} />);

    await confirmDelete();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('profile.errorDeletingAccount');
    expect(alert).not.toHaveTextContent('Failed to fetch');
  });

  it('sends the user to login when the session is gone', async () => {
    vi.mocked(accountService.deleteAccount).mockResolvedValue('signed-out');
    render(<AccountDeleteContent user={user} />);

    await confirmDelete();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('still redirects when sign-out fails after the account is deleted', async () => {
    vi.mocked(accountService.deleteAccount).mockResolvedValue('deleted');
    vi.mocked(authService.signOut).mockRejectedValue(new Error('sign-out failed'));
    render(<AccountDeleteContent user={user} />);

    await confirmDelete();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/?auth=required'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
