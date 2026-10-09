/**
 * Session key under which the signup page stores the email address the user
 * just registered with, so /signup/check-email can offer a real "resend
 * confirmation" action without putting PII in the URL.
 *
 * Kept in its own module (not lib/auth) so importing it never pulls in the
 * Supabase client, which throws at module init when env vars are missing.
 */
export const SIGNUP_PENDING_EMAIL_KEY = 'signup-pending-email';

export function storePendingSignupEmail(email: string): void {
  try {
    sessionStorage.setItem(SIGNUP_PENDING_EMAIL_KEY, email);
  } catch {
    // sessionStorage unavailable (private mode, quota) - resend button
    // simply won't render on the check-email page.
  }
}

export function readPendingSignupEmail(): string | null {
  try {
    return sessionStorage.getItem(SIGNUP_PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
}
