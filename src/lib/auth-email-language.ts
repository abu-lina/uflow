/** Languages the auth email templates exist for. ur and ps fall back to en. */
export const AUTH_EMAIL_LANGUAGES = ['en', 'de', 'ar', 'tr'] as const;

export type AuthEmailLanguage = (typeof AUTH_EMAIL_LANGUAGES)[number];

export function isAuthEmailLanguage(value: unknown): value is AuthEmailLanguage {
  return AUTH_EMAIL_LANGUAGES.some((lang) => lang === value);
}

export function toAuthEmailLanguage(value: unknown): AuthEmailLanguage {
  return isAuthEmailLanguage(value) ? value : 'en';
}
