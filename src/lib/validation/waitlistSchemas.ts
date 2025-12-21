import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  isProvider: z.boolean().nullable(),
});

export const waitlistUpdateSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  waitlistToken: z.string().min(1, 'Token is required'),
  has_seen_early_access: z.boolean().optional(),
  selected_city: z.string().optional(),
  skipped_early_access: z.boolean().optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;







