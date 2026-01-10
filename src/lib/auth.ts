'use client';

import { supabase } from './supabase/client';
import type { Language } from '@/translations';

export const signUpWithLanguage = async (
  email: string,
  password: string,
  language: Language = 'en',
  honeypot?: string,
  termsAccepted?: boolean,
  privacyAccepted?: boolean
) => {
  console.log('[SIGNUP] Creating user via Admin API:', email);
  
  try {
    // Call our server-side API to create user with Admin API
    // This creates the user WITHOUT auto-login (best practice)
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        language,
        honeypot,
        termsAccepted: termsAccepted === true,
        privacyAccepted: privacyAccepted === true
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SIGNUP] Signup failed:', data.error);
      return { 
        data: null, 
        error: { message: data.error || 'Signup failed' } 
      };
    }
    
    console.log('[SIGNUP] ✅ User created successfully (no session)');
    console.log('[SIGNUP] ✅ Confirmation email sent');
    
    // Return success with user data (mimics Supabase response format)
    return { 
      data: { 
        user: { 
          id: data.userId,
          email: data.email
        } 
      }, 
      error: null 
    };
    
  } catch (error) {
    console.error('[SIGNUP] Network or unexpected error:', error);
    return { 
      data: null, 
      error: { message: 'Network error. Please try again.' } 
    };
  }
};

export const resetPasswordWithLanguage = async (
  email: string,
  language: 'en' | 'de' | 'ar' | 'tr' = 'en'
) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';
  
  try {
    // First, check if user exists and is confirmed
    const response = await fetch('/api/check-email-exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return { 
        error: { 
          message: 'Unable to verify email. Please try again.' 
        } 
      };
    }

    const { exists, confirmed } = await response.json();
    
    if (!exists) {
      return { 
        error: { 
          message: 'EMAIL_NOT_FOUND'
        } 
      };
    }

    if (!confirmed) {
      return { 
        error: { 
          message: 'EMAIL_NOT_CONFIRMED'
        } 
      };
    }

    // Generate reset token
    const tokenResponse = await fetch('/api/generate-confirmation-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        type: 'password_reset'
      }),
    });

    if (!tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      return { 
        error: { 
          message: tokenData.error || 'Failed to generate reset token' 
        } 
      };
    }

    const { token } = await tokenResponse.json();
    
    // Send custom email via API route (keeps Resend key server-side)
    const resetUrl = `${siteUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    try {
      const emailResponse = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'resetPassword',
          language,
          confirmationUrl: resetUrl,
        }),
      });
      
      if (!emailResponse.ok) {
        console.error('Failed to send reset email:', await emailResponse.text());
        return { 
          error: { 
            message: 'Failed to send reset email. Please try again.' 
          } 
        };
      }
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      return { 
        error: { 
          message: 'Failed to send reset email. Please try again.' 
        } 
      };
    }
    
    return { error: null };
  } catch (error) {
    console.error('Password reset error:', error);
    return { 
      error: { 
        message: 'Network error. Please try again.' 
      } 
    };
  }
};

export const signInWithEmailConfirmation = async (
  email: string,
  password: string
) => {
  // First, check if user exists and is confirmed via API
  try {
    const response = await fetch('/api/check-email-exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      const { exists, confirmed } = await response.json();
      
      if (!exists) {
        return { 
          data: null, 
          error: { 
            message: 'EMAIL_NOT_FOUND'
          } 
        };
      }

      if (!confirmed) {
        return { 
          data: null, 
          error: { 
            message: 'EMAIL_NOT_CONFIRMED'
          } 
        };
      }
    }
  } catch (error) {
    console.error('Error checking email:', error);
    // If we can't verify email confirmation status, block login for security
    return { 
      data: null, 
      error: { 
        message: 'Unable to verify email confirmation status. Please try again or contact support.'
      } 
    };
  }

  // User exists and is confirmed, proceed with sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { data: null, error };
  }

  // Double-check: Ensure the logged-in user is actually confirmed
  // Check both Supabase's email_confirmed_at and our custom metadata field
  const isConfirmed = 
    data.user?.email_confirmed_at !== null || 
    data.user?.user_metadata?.email_confirmed === true;
  
  if (data.user && !isConfirmed) {
    // Sign out the user immediately if they're not confirmed
    await supabase.auth.signOut();
    return { 
      data: null, 
      error: { 
        message: 'EMAIL_NOT_CONFIRMED'
      } 
    };
  }

  return { data, error: null };
};

/**
 * Sign in with magic link (email-only, no password)
 * For Stage 2 users - passwordless authentication
 * Uses Resend for branded email delivery
 */
export const signInWithMagicLink = async (
  email: string,
  language: 'en' | 'de' | 'ar' | 'tr' = 'en'
) => {
  try {
    // Send magic link via our API (uses Resend for branded emails)
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email,
        language 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes from API
      if (data.error === 'EMAIL_NOT_FOUND') {
        return { 
          data: null, 
          error: { 
            message: 'EMAIL_NOT_FOUND'
          } 
        };
      }

      if (data.error === 'EMAIL_NOT_CONFIRMED') {
        return { 
          data: null, 
          error: { 
            message: 'EMAIL_NOT_CONFIRMED'
          } 
        };
      }

      // Check for specific error codes
      if (data.code === 'IP_BLOCKED') {
        console.error('[MAGIC LINK CLIENT] IP blocked:', data.ip, data.debug);
        return { 
          data: null, 
          error: { 
            message: 'Your IP address has been temporarily blocked. Please try again later or contact support.',
            code: 'IP_BLOCKED',
            details: data
          } 
        };
      }

      if (data.code === 'RATE_LIMIT_EXCEEDED') {
        console.error('[MAGIC LINK CLIENT] Rate limit exceeded:', data);
        return { 
          data: null, 
          error: { 
            message: `Too many requests. Please wait ${data.window} before trying again.`,
            code: 'RATE_LIMIT_EXCEEDED',
            details: data
          } 
        };
      }

      // Generic error - log the full response for debugging
      console.error('[MAGIC LINK CLIENT] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error,
        code: data.code,
        details: data.details,
        debug: data.debug
      });
      
      return { 
        data: null, 
        error: { 
          message: data.error || 'Failed to send magic link. Please try again.',
          code: data.code,
          details: data.details
        } 
      };
    }

    // Success - magic link sent via Resend
    return { 
      data: { 
        message: 'Magic link sent successfully' 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Magic link error:', error);
    return { 
      data: null, 
      error: { 
        message: 'Network error. Please try again.' 
      } 
    };
  }
};

/**
 * Sign up with email only (no password) - for Stage 2
 * Creates user account and sends magic link for first login
 */
export const signUpWithEmailOnly = async (
  email: string,
  language: 'en' | 'de' | 'ar' | 'tr' = 'en',
  honeypot?: string,
  termsAccepted?: boolean,
  privacyAccepted?: boolean
) => {
  console.log('[SIGNUP] Creating user via Admin API (email-only):', email);
  
  try {
    // Call our server-side API to create user without password
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: null, // No password for Stage 2
        language,
        honeypot,
        termsAccepted: termsAccepted === true,
        privacyAccepted: privacyAccepted === true,
        emailOnly: true, // Flag to indicate email-only signup
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[SIGNUP] Signup failed:', data.error);
      return { 
        data: null, 
        error: { message: data.error || 'Signup failed' } 
      };
    }
    
    console.log('[SIGNUP] ✅ User created successfully (no password, no session)');
    
    // After user is created, send magic link for first login
    const magicLinkResult = await signInWithMagicLink(email, language);
    
    if (magicLinkResult.error) {
      // User is created but magic link failed - still return success
      // User can request magic link again later
      console.warn('[SIGNUP] User created but magic link failed:', magicLinkResult.error);
    } else {
      console.log('[SIGNUP] ✅ Magic link sent');
    }
    
    // Return success with user data
    return { 
      data: { 
        user: { 
          id: data.userId,
          email: data.email
        } 
      }, 
      error: null 
    };
    
  } catch (error) {
    console.error('[SIGNUP] Network or unexpected error:', error);
    return { 
      data: null, 
      error: { message: 'Network error. Please try again.' } 
    };
  }
};
