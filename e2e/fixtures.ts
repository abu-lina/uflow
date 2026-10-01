import { execFileSync } from 'node:child_process';

export const TEST_EMAIL = 'e2e-smoke@uflow.test';
export const TEST_PASSWORD = 'e2e-smoke-pw-276';

export interface SupabaseEnv {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
}

interface SupabaseStatusJson {
  API_URL?: string;
  ANON_KEY?: string;
  PUBLISHABLE_KEY?: string;
  SERVICE_ROLE_KEY?: string;
  SECRET_KEY?: string;
}

export function resolveSupabaseEnv(): SupabaseEnv {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (envUrl && envAnon && envService) {
    return { apiUrl: envUrl, anonKey: envAnon, serviceRoleKey: envService };
  }

  const status = JSON.parse(
    execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf-8' }),
  ) as SupabaseStatusJson;

  const apiUrl = envUrl ?? status.API_URL;
  const anonKey = envAnon ?? status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  const serviceRoleKey = envService ?? status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Could not resolve local Supabase credentials. Is `supabase start` running?');
  }
  return { apiUrl, anonKey, serviceRoleKey };
}
