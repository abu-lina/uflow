/**
 * EmailVerificationAlert Component - Usage Examples
 * 
 * A clean, accessible alert component for email verification warnings
 * Built with uFlow design system (Tailwind CSS + Framer Motion)
 */

'use client';

import EmailVerificationAlert from './EmailVerificationAlert';

export function EmailVerificationAlertExamples() {
  // Example 1: Basic usage in login form
  const handleResendEmail = async () => {
    console.log('Resending verification email...');
    // Add your resend logic here
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <h1 className="font-inter-tight text-2xl font-semibold">
        EmailVerificationAlert Examples
      </h1>

      {/* Example 1: German message (default) */}
      <div>
        <h2 className="mb-4 font-inter-tight text-lg font-medium">
          Example 1: Email Verification Required (German)
        </h2>
        <EmailVerificationAlert
          message="Bitte überprüfe deine E-Mail und bestätige deine Registrierung vor der Anmeldung."
          onResend={handleResendEmail}
        />
      </div>

      {/* Example 2: English message */}
      <div>
        <h2 className="mb-4 font-inter-tight text-lg font-medium">
          Example 2: Email Verification Required (English)
        </h2>
        <EmailVerificationAlert
          message="Please check your email and confirm your registration before signing in."
          onResend={handleResendEmail}
        />
      </div>

      {/* Example 3: Custom message */}
      <div>
        <h2 className="mb-4 font-inter-tight text-lg font-medium">
          Example 3: Custom Message
        </h2>
        <EmailVerificationAlert
          message="Dein Konto ist noch nicht aktiviert. Bitte bestätige deine E-Mail-Adresse."
          onResend={handleResendEmail}
        />
      </div>

      {/* Example 4: In a form context */}
      <div>
        <h2 className="mb-4 font-inter-tight text-lg font-medium">
          Example 4: Within Login Form Context
        </h2>
        <div className="max-w-md rounded-lg border border-border bg-white p-6">
          <h3 className="mb-4 font-inter-tight text-lg font-semibold">
            Anmelden
          </h3>
          
          {/* Mock form fields */}
          <div className="mb-4 flex flex-col gap-3">
            <input
              className="rounded-md border border-border px-3 py-2 font-inter-tight text-sm"
              placeholder="E-Mail"
              type="email"
            />
            <input
              className="rounded-md border border-border px-3 py-2 font-inter-tight text-sm"
              placeholder="Passwort"
              type="password"
            />
          </div>

          {/* Alert appears here when email is unconfirmed */}
          <EmailVerificationAlert
            message="Bitte überprüfe deine E-Mail und bestätige deine Registrierung vor der Anmeldung."
            onResend={handleResendEmail}
          />

          {/* Mock button */}
          <button
            className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-inter-tight text-sm font-medium text-white hover:bg-primary/90"
            type="button"
          >
            Anmelden
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Integration Guide:
 * 
 * 1. Import the component:
 *    import EmailVerificationAlert from '@/components/ui/EmailVerificationAlert';
 * 
 * 2. Use it in your login form:
 *    {error && isEmailConfirmationError && (
 *      <EmailVerificationAlert
 *        message={error}
 *        onResend={handleResendConfirmation}
 *      />
 *    )}
 * 
 * 3. Define your resend handler:
 *    const handleResendConfirmation = async () => {
 *      // Your resend email logic here
 *      const response = await fetch('/api/resend-verification', {
 *        method: 'POST',
 *        body: JSON.stringify({ email: userEmail })
 *      });
 *    };
 * 
 * Features:
 * - ✅ Smooth fade-in + slide-up animation (Framer Motion)
 * - ✅ Accessible (role="alert", aria-live="assertive")
 * - ✅ Responsive and mobile-first
 * - ✅ uFlow design system colors and spacing
 * - ✅ Keyboard navigation support
 * - ✅ Focus-visible ring for accessibility
 */

