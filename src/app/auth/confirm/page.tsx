'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, XCircle, Loader2 } from 'lucide-react';

function ConfirmEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const confirmEmail = async () => {
      // Handle both 'token' (custom system) and 'token_hash' (Supabase system) parameters
      const token = searchParams.get('token') || searchParams.get('token_hash');
      const email = searchParams.get('email');

      if (!token || !email) {
        setStatus('error');
        return;
      }

      // Check if token looks like an email address (common issue)
      if (token.includes('@') && token.includes('.')) {
        console.error(
          '[CONFIRM PAGE] Token appears to be an email address instead of a proper token:',
          token,
        );
        setStatus('error');
        return;
      }

      try {
        console.log('[CONFIRM PAGE] Confirming email:', {
          email,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          fullToken: token,
          urlParams: Object.fromEntries(searchParams.entries()),
        });

        // Call our API to confirm the email
        const response = await fetch('/api/confirm-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            email,
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
            responseHeaders: Object.fromEntries(response.headers.entries()),
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-icon-xl w-icon-xl animate-spin text-primary" />
          <p className="text-content">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto mb-4 h-icon-3xl w-icon-3xl text-danger" />
          <h1 className="mb-4 text-2xl font-bold text-content-heading">Error confirming email</h1>
          <p className="mb-6 text-content">
            The confirmation link appears to be invalid or expired. This can happen if:
          </p>
          <ul className="mx-auto mb-6 max-w-md text-left text-content">
            <li>• The link has already been used</li>
            <li>• The link has expired (links expire after 24 hours)</li>
            <li>• The link was corrupted during email transmission</li>
          </ul>
          <div className="space-y-3">
            <button
              className="mx-auto block rounded-lg bg-primary px-6 py-3 text-white transition-colors hover:bg-primary/90"
              onClick={() => router.push('/login')}
            >
              Go to Login
            </button>
            <button
              className="mx-auto block rounded-lg bg-gray-200 px-6 py-3 text-content transition-colors hover:bg-gray-300"
              onClick={() => router.push('/auth/signup')}
            >
              Sign Up Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <MailCheck className="mx-auto mb-4 h-icon-3xl w-icon-3xl text-success" />
        <h1 className="mb-4 text-2xl font-bold text-content-heading">
          Email confirmed successfully!
        </h1>
        <p className="mb-6 text-content">Redirecting to your dashboard...</p>
        <Loader2 className="mx-auto h-icon-lg w-icon-lg animate-spin text-primary" />
      </div>
    </div>
  );
}

export default function ConfirmEmail() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
