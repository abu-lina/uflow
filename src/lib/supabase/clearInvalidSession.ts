/**
 * Clear invalid session from localStorage
 * This helps fix "Invalid Refresh Token: Refresh Token Not Found" errors
 */
export function clearInvalidSession() {
  if (typeof window === 'undefined') return;

  try {
    // Clear Supabase session data from localStorage
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('sb-') || key?.includes('supabase')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('Cleared invalid session data');
  } catch (error) {
    console.warn('Failed to clear session:', error);
  }
}

