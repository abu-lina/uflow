import { z } from 'zod';

export const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  isProvider: z.boolean().nullable(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;







