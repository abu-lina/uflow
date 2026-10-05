import { z } from 'zod';

export type ValidationDetail = { path: string; message: string };

/**
 * Maps a ZodError to the stable, zod-agnostic shape exposed in 400 response
 * bodies. Keeps zod's internal issue object (code, origin, pattern, ...) off
 * the public API seam, so a zod major bump changes one file, not every route.
 * Root-level issues yield an empty path string.
 */
export function toValidationDetails(error: z.ZodError): ValidationDetail[] {
  return error.issues.map((issue) => ({
    // issue.path is PropertyKey[] in v4 — map(String) so a symbol segment
    // stringifies instead of throwing inside an error handler.
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}
