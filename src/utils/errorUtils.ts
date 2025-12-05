/**
 * Utility functions for better error logging and handling
 */

/**
 * Format Supabase/PostgrestError for better console logging
 * Supabase errors don't serialize well with console.error, so we extract key properties
 */
export function formatSupabaseError(error: unknown): {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  error: unknown;
} {
  // Handle null/undefined
  if (!error) {
    return {
      message: 'Unknown error (error object is null or undefined)',
      error: error,
    };
  }

  // Handle Error instances
  if (error instanceof Error) {
    return {
      message: error.message || 'Error instance without message',
      code: (error as unknown as { code?: string }).code,
      error: error,
    };
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const nestedError = err.error && typeof err.error === 'object' 
      ? (err.error as Record<string, unknown>)
      : null;
    
    // Try to extract all possible error properties
    // PostgREST errors have: message, code, details, hint
    const message = 
      (err.message as string) || 
      (nestedError?.message as string) || 
      (typeof err.toString === 'function' ? err.toString() : String(err)) || 
      'Unknown error';
    
    const code = 
      (err.code as string) || 
      (nestedError?.code as string) || 
      undefined;
    
    const details = 
      (err.details as string) || 
      (nestedError?.details as string) || 
      undefined;
    
    const hint = 
      (err.hint as string) || 
      (nestedError?.hint as string) || 
      undefined;
    
    return {
      message,
      code,
      details,
      hint,
      error: error,
    };
  }
  
  return {
    message: String(error || 'Unknown error'),
    error: error,
  };
}

/**
 * Log Supabase error with full details
 */
export function logSupabaseError(context: string, error: unknown): void {
  const formatted = formatSupabaseError(error);
  
  // Check for common API key errors and provide helpful guidance
  const errorMessage = String(formatted.message || '').toLowerCase();
  const isApiKeyError = errorMessage.includes('invalid api key') || 
                        errorMessage.includes('api key') ||
                        formatted.code === 'PGRST301' ||
                        formatted.code === 'PGRST302';
  
  // Log with multiple methods to ensure visibility
  console.error(`[${context}] Error:`, formatted.message);
  console.error(`[${context}] Code:`, formatted.code || 'N/A');
  console.error(`[${context}] Details:`, formatted.details || 'N/A');
  console.error(`[${context}] Hint:`, formatted.hint || 'N/A');
  
  // Provide helpful guidance for API key errors
  if (isApiKeyError) {
    console.error(
      `[${context}] 🔑 API Key Error Detected!\n` +
      'This usually means:\n' +
      '1. Your NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or incorrect\n' +
      '2. The API key doesn\'t match your NEXT_PUBLIC_SUPABASE_URL project\n' +
      '3. The API key has been revoked or expired\n\n' +
      'To fix:\n' +
      '1. Check your .env.local file\n' +
      '2. Verify your Supabase project URL and anon key match\n' +
      '3. Get your keys from: https://supabase.com/dashboard/project/_/settings/api\n' +
      '4. Restart your dev server after updating .env.local'
    );
  }
  
  // Check for network errors (Failed to fetch)
  const isNetworkError = errorMessage.includes('failed to fetch') ||
                         errorMessage.includes('network error') ||
                         formatted.message.includes('Failed to fetch');
  
  if (isNetworkError) {
    console.error(
      `[${context}] 🌐 Network Error Detected!\n` +
      'This usually means:\n' +
      '1. No internet connection or network issues\n' +
      '2. Supabase project URL is incorrect or unreachable\n' +
      '3. CORS issues (check browser console for CORS errors)\n' +
      '4. Dev server needs restart after .env.local changes\n\n' +
      'To fix:\n' +
      '1. Check your internet connection\n' +
      '2. Verify NEXT_PUBLIC_SUPABASE_URL in .env.local\n' +
      '3. Restart your dev server: npm run dev\n' +
      '4. Check browser console for CORS errors\n' +
      '5. Verify Supabase project is accessible: ' + 
      (process.env.NEXT_PUBLIC_SUPABASE_URL || 'check .env.local')
    );
  }
  
  // Also log the full error object for debugging
  if (formatted.error) {
    console.error(`[${context}] Full error:`, formatted.error);
    
    // Try to stringify if possible
    try {
      const errorString = JSON.stringify(formatted.error, Object.getOwnPropertyNames(formatted.error));
      console.error(`[${context}] Error JSON:`, errorString);
    } catch {
      // If stringification fails, log the error directly
      console.error(`[${context}] Error (non-serializable):`, formatted.error);
    }
  }
}

