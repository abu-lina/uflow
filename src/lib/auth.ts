import { supabase } from './supabase/client';

export const signUpWithLanguage = async (
  email: string,
  password: string,
  language: 'en' | 'de' = 'en'
) => {
  // Sign up user - Supabase will send its default email
  // We need to disable email confirmation in Supabase dashboard
  // OR use a custom SMTP in Supabase that points to a non-existent server
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Don't set emailRedirectTo to prevent Supabase from sending email
      data: {
        language,
        preferred_language: language
      }
    }
  });
  
  if (data.user && !error) {
    // Send custom email via API route (keeps Resend key server-side)
    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token=${data.user.id}&type=signup`;
    
    try {
      const response = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          type: 'confirmSignup',
          language,
          confirmationUrl,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to send confirmation email:', await response.text());
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
  }
  
  return { data, error };
};

export const resetPasswordWithLanguage = async (
  email: string,
  language: 'en' | 'de' = 'en'
) => {
  // Request password reset from Supabase
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
  });
  
  if (!error) {
    // Send custom email via API route (keeps Resend key server-side)
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`;
    
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
