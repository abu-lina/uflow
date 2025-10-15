import { supabase } from './supabase/client';

export const signUpWithLanguage = async (
  email: string,
  password: string,
  language: 'en' | 'de' = 'en'
) => {
  // Sign up user with email confirmation enabled
  // Supabase creates user but marks as unconfirmed
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        language,
        preferred_language: language
      }
    }
  });
  
  if (data.user && data.session && !error) {
    // Get the confirmation token from the session
    // Supabase generates this but won't send email (invalid SMTP)
    const token = data.session.access_token;
    const confirmationUrl = `${siteUrl}/auth/confirm?token=${token}&type=signup&email=${encodeURIComponent(email)}`;
    
    try {
      // Send our custom multilingual email via API route
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
