import { supabase } from './supabase/client';

export const signUpWithLanguage = async (
  email: string,
  password: string,
  language: 'en' | 'de' = 'en'
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
        language
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
  language: 'en' | 'de' = 'en'
) => {
  // Request password reset from Supabase
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`
  });
  
  if (!error) {
    // Send custom email via API route (keeps Resend key server-side)
    const resetUrl = `${siteUrl}/auth/reset-password`;
    
    try {
      const response = await fetch('/api/send-auth-email', {
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
      
      if (!response.ok) {
        console.error('Failed to send reset email:', await response.text());
      }
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }
  }
  
  return { error };
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
  if (data.user && data.user.user_metadata?.email_confirmed !== true) {
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
