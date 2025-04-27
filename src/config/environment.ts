import { z } from 'zod';

const envSchema = z.object({
  // Public environment variables
  NEXT_PUBLIC_APP_URL: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  NEXT_PUBLIC_SEARCH_API_URL: z.string().optional(),
  NEXT_PUBLIC_SEARCH_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GA_ID: z.string().optional(),

  // Server-only environment variables
  JWT_SECRET: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Optional environment variables
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SEARCH_API_URL: process.env.NEXT_PUBLIC_SEARCH_API_URL,
  NEXT_PUBLIC_SEARCH_API_KEY: process.env.NEXT_PUBLIC_SEARCH_API_KEY,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  JWT_SECRET: process.env.JWT_SECRET,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV: process.env.NODE_ENV,
});

export const validateEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.errors);
      throw new Error('Invalid environment variables');
    }
    throw error;
  }
};
