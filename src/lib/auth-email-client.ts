import { toAuthEmailLanguage } from '@/lib/auth-email-language';

/**
 * Asks the server to mail a confirmation or password-reset link. The server
 * mints the token and sends the email; the browser never sees the token. The
 * response is the same whether or not the account exists, so callers must not
 * infer account state from it. A 403 or 429 deliberately maps to the same generic failure
 * message as any other error, so the helper returns only a boolean.
 */
export async function requestAuthEmail(
  email: string,
  type: 'signup' | 'password_reset',
  language: unknown,
): Promise<boolean> {
  const response = await fetch('/api/generate-confirmation-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type, language: toAuthEmailLanguage(language) }),
  });
  return response.ok;
}
