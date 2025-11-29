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
  
  // Log with multiple methods to ensure visibility
  console.error(`[${context}] Error:`, formatted.message);
  console.error(`[${context}] Code:`, formatted.code || 'N/A');
  console.error(`[${context}] Details:`, formatted.details || 'N/A');
  console.error(`[${context}] Hint:`, formatted.hint || 'N/A');
  
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

