'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');
      const code = searchParams.get('code');
      const magicToken = searchParams.get('magic_token');
      const email = searchParams.get('email');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      console.log('[AUTH CALLBACK PAGE] Processing callback:', { 
        hasToken: !!token, 
        hasCode: !!code, 
        hasMagicToken: !!magicToken,
        type,
        error,
        errorDescription
      });

      // Check for error parameters from Supabase redirect
      if (error) {
        console.error('[AUTH CALLBACK PAGE] Error from Supabase:', error, errorDescription);
        setErrorMessage(
          errorDescription || 
          error || 
          'The authentication link is invalid or has expired. Please request a new magic link.'
        );
        setStatus('error');
        return;
      }

      try {
        // Handle custom magic link flow (magic_token parameter from our custom system)
        if (magicToken && email) {
          console.log('[AUTH CALLBACK PAGE] Processing custom magic link token');
          
          // Verify the token with our API
          const verifyResponse = await fetch('/api/auth/verify-magic-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: magicToken,
              email
            }),
          });
          
          const verifyData = await verifyResponse.json();
          
          if (!verifyResponse.ok) {
            console.error('[AUTH CALLBACK PAGE] Token verification failed:', verifyData.error);
            setErrorMessage(
              verifyData.error || 
              'This magic link is invalid or has expired. Please request a new one.'
            );
            setStatus('error');
            return;
          }
          
          if (!verifyData.success || !verifyData.hashedToken) {
            console.error('[AUTH CALLBACK PAGE] No hashed token in response');
            setErrorMessage('Failed to create session. Please try again.');
            setStatus('error');
            return;
          }
          
          // Use the hashed token to create a session via verifyOtp
          console.log('[AUTH CALLBACK PAGE] Creating session with hashed token');
          const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: verifyData.hashedToken,
            type: 'magiclink'
          });
          
          if (verifyError) {
            console.error('[AUTH CALLBACK PAGE] Session creation error:', verifyError);
            setErrorMessage(verifyError.message || 'Failed to create session. Please try again.');
            setStatus('error');
            return;
          }
          
          if (sessionData.session) {
            console.log('[AUTH CALLBACK PAGE] ✅ Session created successfully');
            setStatus('success');
            setTimeout(() => {
              router.push('/');
            }, 1500);
            return;
          }
          
          // Fallback: Check if session was created
          const { data: { session: checkSession } } = await supabase.auth.getSession();
          if (checkSession) {
            console.log('[AUTH CALLBACK PAGE] ✅ Session found after verification');
            setStatus('success');
            setTimeout(() => {
              router.push('/');
            }, 1500);
            return;
          }
          
          console.error('[AUTH CALLBACK PAGE] No session created after verification');
          setErrorMessage('Failed to create session. Please try again.');
          setStatus('error');
          return;
        }

        // Handle OAuth flow (code parameter)
        if (code) {
          console.log('[AUTH CALLBACK PAGE] Processing OAuth code exchange');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('[AUTH CALLBACK PAGE] OAuth error:', exchangeError);
            setErrorMessage(exchangeError.message || 'Failed to authenticate');
            setStatus('error');
            return;
          }

          if (data.session) {
            console.log('[AUTH CALLBACK PAGE] ✅ OAuth session created successfully');
            setStatus('success');
            // Redirect to home or dashboard after a brief delay
            setTimeout(() => {
              router.push('/');
            }, 2000);
            return;
          }
        }

        // Handle Supabase magic link flow (legacy - token parameter from Supabase)
        if (token || type === 'magiclink') {
          console.log('[AUTH CALLBACK PAGE] Processing Supabase magic link');
          
          // Wait for Supabase to process the redirect and create the session
          // Check multiple times with increasing delays
          let session = null;
          let attempts = 0;
          const maxAttempts = 5;
          
          while (!session && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 300 * (attempts + 1)));
            const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('[AUTH CALLBACK PAGE] Session error:', sessionError);
            }
            
            if (currentSession) {
              session = currentSession;
              console.log('[AUTH CALLBACK PAGE] ✅ Session found after', attempts + 1, 'attempt(s)');
              break;
            }
            
            attempts++;
            console.log('[AUTH CALLBACK PAGE] Attempt', attempts, '- no session yet, waiting...');
          }
          
          if (session) {
            setStatus('success');
            setTimeout(() => {
              router.push('/');
            }, 1500);
            return;
          }

          // If still no session after all attempts, the token might have been used or expired
          console.warn('[AUTH CALLBACK PAGE] No session found after', maxAttempts, 'attempts');
          setErrorMessage(
            'This magic link has already been used or has expired. ' +
            'Magic links can only be used once and expire after 1 hour. Please request a new one.'
          );
          setStatus('error');
          return;
        }

        // Check for existing session (might have been created by Supabase automatically)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('[AUTH CALLBACK PAGE] ✅ Existing session found');
          setStatus('success');
          setTimeout(() => {
            router.push('/');
          }, 2000);
          return;
        }

        // No valid parameters and no session
        console.error('[AUTH CALLBACK PAGE] No valid code or token found, and no session exists');
        setErrorMessage('Invalid authentication link. Please request a new magic link.');
        setStatus('error');

      } catch (error) {
        console.error('[AUTH CALLBACK PAGE] Exception during callback:', error);
        setErrorMessage('An unexpected error occurred. Please try again.');
        setStatus('error');
      }
    };

    let authSubscription: { unsubscribe: () => void } | null = null;
    
    // Set up auth state listener outside the async function
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH CALLBACK PAGE] Auth state changed:', event, 'Session:', !!session);
      if (event === 'SIGNED_IN' && session) {
        console.log('[AUTH CALLBACK PAGE] ✅ Session created via auth state change');
        setStatus('success');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    });
    authSubscription = subscription;

    handleCallback();

    // Cleanup: Unsubscribe from auth state changes when component unmounts
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [router, searchParams]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium">Verifying authentication...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold">Authentication successful!</h1>
        <p className="mt-2 text-gray-600">Redirecting you now...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <XCircle className="h-12 w-12 text-red-500" />
      <h1 className="mt-4 text-2xl font-bold">Authentication failed</h1>
      <p className="mt-2 text-center text-gray-600">{errorMessage}</p>
      <div className="mt-6 flex gap-4">
        <button
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
          onClick={() => router.push('/login')}
        >
          Go to Login
        </button>
        <button
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
          onClick={() => router.push('/')}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
