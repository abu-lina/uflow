import { supabase } from './supabase/client';
import { sendAuthEmail } from '../services/emailService';

export const signUpWithLanguage = async (
  email: string,
  password: string,
  language: 'en' | 'de' = 'en'
) => {
  // Sign up user (without email confirmation)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        language,
        preferred_language: language
      }
    }
  });
  
  if (data.user && !error) {
    // Send custom email with language
    const confirmationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token=${data.user.id}&type=signup`;
    
    try {
      await sendAuthEmail(
        email,
        'confirmSignup',
        language,
        confirmationUrl
      );
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
    // Send custom email with language
    // Note: Supabase will send its own email with the reset link
    // This is a backup/notification email
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`;
    
    try {
      await sendAuthEmail(
        email,
        'resetPassword',
        language,
        resetUrl
      );
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }
  }
  
  return { error };
};
