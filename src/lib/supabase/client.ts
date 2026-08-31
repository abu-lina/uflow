import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables with helpful error messages
// Only validate if values are present (allows build to proceed if secrets are properly set)
if (!supabaseUrl) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
    'Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL is set. ' +
    'Get your Supabase URL from: https://supabase.com/dashboard/project/_/settings/api'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
    'Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set. ' +
    'Get your Supabase anon key from: https://supabase.com/dashboard/project/_/settings/api'
  );
}

// Validate URL format (only if value is provided and non-empty)
// Allow local Supabase URLs (http://127.0.0.1 or http://localhost) for local development
const isLocalUrl = supabaseUrl && (
  supabaseUrl.startsWith('http://127.0.0.1') || supabaseUrl.startsWith('http://localhost')
);
if (supabaseUrl && supabaseUrl.trim().length > 0 && !isLocalUrl) {
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL format: "${supabaseUrl}". ` +
      'Expected format: https://your-project-ref.supabase.co. ' +
      'Please check your .env.local file.'
    );
  }
}

// Validate API key format (only if value is provided and non-empty)
// Accepted formats:
// - sb_publishable_ prefix (new format, preferred)
// - eyJ prefix (legacy JWT format, still supported)
if (supabaseAnonKey && supabaseAnonKey.trim().length > 0) {
  const isValidFormat = supabaseAnonKey.startsWith('sb_') || supabaseAnonKey.startsWith('eyJ');
  const minLength = supabaseAnonKey.startsWith('eyJ') ? 100 : 30;

  if (!isValidFormat || supabaseAnonKey.length < minLength) {
    throw new Error(
      supabaseAnonKey.includes('your') || supabaseAnonKey.includes('placeholder')
        ? 'Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY: appears to be a placeholder value. ' +
          'Replace it with your actual key from: https://supabase.com/dashboard/project/_/settings/api'
        : 'Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format. ' +
          'Expected a publishable key (starts with "sb_publishable_") or legacy JWT (starts with "eyJ"). ' +
          'Get your key from: https://supabase.com/dashboard/project/_/settings/api'
    );
  }
}

// Try to extract project ref from JWT token to validate URL/key match
// Only works for JWT format (eyJ), not for new publishable keys (sb_)
if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.startsWith('eyJ')) {
  try {
    const tokenParts = supabaseAnonKey.split('.');
    if (tokenParts.length >= 2) {
      const payload = JSON.parse(atob(tokenParts[1]));
      const keyProjectRef = payload.ref;
      const urlProjectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      
      if (keyProjectRef && urlProjectRef && keyProjectRef !== urlProjectRef) {
        console.warn(
          `⚠️  Supabase Configuration Mismatch Detected!\n` +
          `   URL points to project: ${urlProjectRef}\n` +
          `   API key belongs to project: ${keyProjectRef}\n` +
          `   This will cause "Invalid API key" errors.\n\n` +
          `   To fix:\n` +
          `   1. Ensure your URL and key are from the same Supabase project\n` +
          `   2. Get correct keys from: https://supabase.com/dashboard/project/${urlProjectRef}/settings/api\n` +
          `   3. Restart your dev server after updating .env.local`
        );
      }
    }
  } catch {
    // If we can't parse the token, that's okay - validation will happen at runtime
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Prevent console errors for invalid refresh tokens
    flowType: 'pkce',
  },
  // Add global error handling for network issues
  global: {
    headers: {
      'x-client-info': 'uflow-web',
    },
  },
});

// Helper function to verify Supabase connection
export async function verifySupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('providers').select('provider_id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
