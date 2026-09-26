/**
 * Halal certificate upload constraints (#415 AC6.8).
 * Shared by the create wizard (create/halal) and the submission service so
 * the browser hint (accept="image/*,.pdf") is enforced at both boundaries.
 */

export const CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function isCertificateTypeAllowed(file: File): boolean {
  return file.type.startsWith('image/') || file.type === 'application/pdf';
}

export type CertificateValidation = 'ok' | 'invalidType' | 'tooLarge';

export function validateCertificateFile(file: File): CertificateValidation {
  if (!isCertificateTypeAllowed(file)) return 'invalidType';
  if (file.size > CERTIFICATE_MAX_BYTES) return 'tooLarge';
  return 'ok';
}
