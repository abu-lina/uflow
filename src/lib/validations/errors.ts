import { z } from 'zod';

/**
 * Maps a ZodError to the stable, zod-agnostic shape exposed in 400 response
 * bodies. Keeps zod's internal issue object (code, origin, pattern, ...) off
 * the public API seam, so a zod major bump changes one file, not every route.
 * Root-level issues yield an empty path string.
 */
export function toValidationDetails(error: z.ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}
