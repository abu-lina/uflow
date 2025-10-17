'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConfirmEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const email = searchParams.get('email');
      
      if (!token || !email) {
        setStatus('error');
        return;
      }

      try {
        console.log('[CONFIRM PAGE] Confirming email:', { 
          email, 
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...'
        });
        
        // Call our API to confirm the email
        const response = await fetch('/api/confirm-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            email
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch((e) => {
            console.error('[CONFIRM PAGE] Failed to parse error response:', e);
            return {};
          });
          console.error('[CONFIRM PAGE] Email confirmation failed:', {
            status: response.status,
            statusText: response.statusText,
            errorMessage: errorData.error,
            errorDetails: errorData.details,
            fullError: errorData,
            responseHeaders: Object.fromEntries(response.headers.entries())
          });
          setStatus('error');
        } else {
          const successData = await response.json();
          console.log('[CONFIRM PAGE] ✅ Email confirmation successful:', successData);
          setStatus('success');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      } catch (error) {
        console.error('[CONFIRM PAGE] Exception during confirmation:', error);
        setStatus('error');
      }
    };

    confirmEmail();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mint mx-auto mb-4"></div>
          <p className="text-content">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-danger text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-content-title mb-4">Error confirming email</h1>
          <p className="text-content mb-6">Please try again or contact support if the problem persists.</p>
          <button 
            className="bg-mint text-white px-6 py-3 rounded-lg hover:bg-mint/90 transition-colors"
            onClick={() => router.push('/auth/signup')}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-success text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-content-title mb-4">Email confirmed successfully!</h1>
        <p className="text-content mb-6">Redirecting to your dashboard...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint mx-auto"></div>
      </div>
    </div>
  );
}
