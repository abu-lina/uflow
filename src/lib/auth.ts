import { createClient } from '@supabase/supabase-js';
import { sendAuthEmail } from '../services/emailService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  // Reset password (without email)
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  });
  
  if (!error) {
    // Send custom email with language
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${data.user?.id}`;
    
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
  
  return { data, error };
};
