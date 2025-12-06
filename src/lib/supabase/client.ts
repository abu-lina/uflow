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
if (supabaseUrl && supabaseUrl.trim().length > 0) {
  if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL format: "${supabaseUrl}". ` +
      'Expected format: https://your-project-ref.supabase.co. ' +
      'Please check your .env.local file.'
    );
  }
}

// Validate API key format (only if value is provided and non-empty)
// Supabase anon keys can be either:
// - JWT tokens (starts with 'eyJ') - legacy format, typically 200+ chars
// - Publishable keys (starts with 'sb_') - new format, typically 40-60 chars
if (supabaseAnonKey && supabaseAnonKey.trim().length > 0) {
  const isValidFormat = supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.startsWith('sb_');
  // JWT tokens are much longer, publishable keys are shorter
  const minLength = supabaseAnonKey.startsWith('eyJ') ? 100 : 30;
  const isLongEnough = supabaseAnonKey.length >= minLength;
  
  if (!isLongEnough || !isValidFormat) {
    const isPlaceholder = supabaseAnonKey.includes('your') || 
                          supabaseAnonKey.includes('placeholder') ||
                          supabaseAnonKey === 'your-anon-key-here' ||
                          supabaseAnonKey === 'your-dev-anon-key-here';
    
    if (isPlaceholder) {
      throw new Error(
        `Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY: appears to be a placeholder value. ` +
        'Please replace it with your actual Supabase anon key from: ' +
        'https://supabase.com/dashboard/project/_/settings/api'
      );
    }
    
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format. ` +
      'Expected a JWT token (starts with "eyJ") or publishable key (starts with "sb_"). ' +
      'Please verify your .env.local file has the correct anon key from: ' +
      'https://supabase.com/dashboard/project/_/settings/api'
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
          `   1. For local dev (.env.local): Use DEV project (qrekonfhaenjdnjhwdum)\n` +
          `   2. For UAT (.env.uat): Use UAT project (rdtdtcfntopcxcigkqoq)\n` +
          `   3. Get correct keys from: https://supabase.com/dashboard/project/${keyProjectRef}/settings/api\n` +
          `   4. Restart your dev server after updating .env.local`
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
