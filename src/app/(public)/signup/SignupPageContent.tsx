'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { TitleAndText } from '@/components/ui/TitleAndText';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { signUpWithLanguage } from '@/lib/auth';
import { storePendingSignupEmail } from '@/lib/signup-session';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Opaque sentinel codes returned by /api/auth/signup (and produced locally
 * for network failures) mapped to translation keys. Any code not in this
 * table falls back to `signup.genericError`, so a new server code can never
 * render blank or leak a raw internal string to the user.
 */
const SIGNUP_ERROR_KEYS: Record<string, string> = {
  ACCESS_RESTRICTED: 'signup.accessRestricted',
  RATE_LIMIT_EXCEEDED: 'signup.rateLimited',
  CONSENT_REQUIRED: 'legal.consentRequired',
  INVALID_REQUEST: 'signup.genericError',
  EMAIL_REQUIRED: 'signup.emailRequired',
  PASSWORD_REQUIRED: 'signup.passwordRequired',
  EMAIL_INVALID: 'signup.emailInvalid',
  EMAIL_DISPOSABLE: 'signup.emailDisposable',
  PASSWORD_TOO_SHORT: 'signup.passwordTooShort',
  PASSWORD_NEEDS_LETTER: 'signup.passwordNeedsLetter',
  PASSWORD_NEEDS_NUMBER: 'signup.passwordNeedsNumber',
  EMAIL_ALREADY_REGISTERED: 'signup.emailAlreadyRegistered',
  SIGNUP_FAILED: 'signup.genericError',
  NETWORK_ERROR: 'signup.networkError',
};

export function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const { t } = useLanguage();

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Redirect if already logged in; complete provider claim if claim token is present
  useEffect(() => {
    if (user) {
      const claimToken = searchParams.get('claim');
      if (claimToken) {
        fetch('/api/outreach/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: claimToken }),
        })
          .catch(() => {
            // Claim request failed — redirect to profile regardless
          })
          .finally(() => {
            router.replace('/profile');
          });
      } else {
        const returnUrl = searchParams.get('returnUrl');
        if (returnUrl) {
          router.replace(decodeURIComponent(returnUrl));
        } else {
          router.replace('/profile');
        }
      }
    }
  }, [user, router, searchParams]);

  // Don't render if already logged in or redirecting (to prevent flash)
  if (user || isRedirecting) {
    return null;
  }

  const validateForm = () => {
    if (!formData.email) {
      setError(t('signup.emailRequired'));
      return false;
    }

    // Enhanced password validation
    if (formData.password.length < 8) {
      setError(t('signup.passwordTooShort'));
      return false;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(formData.password)) {
      setError(t('signup.passwordNeedsLetter'));
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(formData.password)) {
      setError(t('signup.passwordNeedsNumber'));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('signup.passwordsMismatch'));
      return false;
    }

    // Check consent (GDPR requirement)
    if (!termsAccepted || !privacyAccepted) {
      setError(t('legal.consentRequired'));
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get honeypot value from form
      const form = e.target as HTMLFormElement;
      const honeypotInput = form.querySelector('input[name="website"]') as HTMLInputElement;
      const honeypot = honeypotInput?.value || '';

      const { data, error } = await signUpWithLanguage(
        formData.email,
        formData.password,
        language,
        honeypot,
        termsAccepted,
        privacyAccepted,
      );

      if (error) {
        // The API returns opaque sentinel codes; map them to translated
        // strings. Unknown/missing codes get the generic translated message -
        // raw server text and codes are never rendered to the user.
        const code = (error as { code?: string }).code;
        setError(t(SIGNUP_ERROR_KEYS[code ?? ''] ?? 'signup.genericError'));
        setIsLoading(false);
        return;
      }

      // Success - redirect only if we have valid data
      if (data) {
        // Set redirecting state immediately to hide content
        setIsRedirecting(true);

        // Remember the address so check-email can offer a working resend
        storePendingSignupEmail(formData.email);

        // Redirect to check email page
        router.push('/signup/check-email');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError(t('signup.unexpectedError'));
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    } else {
      router.push('/login');
    }
  };

  return (
    <PageLayout hasBackground={false}>
      {/* Loading Overlay - Prevents flash during redirect */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#589D96]"></div>
            <p className="text-sm text-[#7A7A7A]">{t('signup.redirecting')}</p>
          </div>
        </div>
      )}

      <PageHeader
        rightIcon={<Logo className="h-12 w-12" height={48} width={48} />}
        title={t('signup.title')}
        variant="title-and-icon"
      />

      <HeaderSpacer />

      <PageContentWrapper centerVertically={true} contentClassName="gap-10">
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description={t('signup.welcomeDescription')}
            title={t('signup.welcomeTitle')}
          />
        </TitleSection>

        {/* Form Content with exact spacing structure */}
        <div className="flex w-full flex-col">
          <ContentSection>
            <form className="flex w-full flex-col" onSubmit={handleSubmit}>
              {/* Honeypot field - hidden from users */}
              <input
                aria-hidden="true"
                autoComplete="off"
                name="website"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: '1px',
                  height: '1px',
                  overflow: 'hidden',
                }}
                tabIndex={-1}
                type="text"
              />

              {/* Form Input Fields */}
              <FormInputGroup gap="gap-3">
                <FormInput
                  required
                  label={t('signup.emailLabel')}
                  placeholder={t('signup.emailPlaceholder')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                <FormInput
                  required
                  label={t('signup.passwordLabel')}
                  placeholder={t('signup.passwordPlaceholder')}
                  rightIcon={
                    showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />
                  }
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  variant="with-icon"
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onRightIconClick={() => setShowPassword(!showPassword)}
                />
                <FormInput
                  required
                  label={t('signup.confirmPasswordLabel')}
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  rightIcon={
                    showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )
                  }
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  variant="with-icon"
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </FormInputGroup>

              {/* Error Messages */}
              {error && (
                <div className="mt-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-danger"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            clipRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            fillRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-inter-tight text-sm leading-[19px] text-danger">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Consent Checkbox (24px gap from form fields) */}
              <div className="mt-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    required
                    aria-label={t('legal.acceptTerms')}
                    aria-required="true"
                    checked={termsAccepted && privacyAccepted}
                    className="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[#589D96] focus:ring-2 focus:ring-[#589D96]"
                    type="checkbox"
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      setPrivacyAccepted(e.target.checked);
                    }}
                  />
                  <span className="text-[11px] leading-[13px] text-[#7A7A7A]">
                    {t('legal.acceptTermsText')}
                    <Link className="underline hover:text-[#589D96]" href="/terms">
                      {t('legal.termsOfService')}
                    </Link>{' '}
                    {t('legal.and')}{' '}
                    <Link className="underline hover:text-[#589D96]" href="/privacy-policy">
                      {t('legal.privacyPolicy')}
                    </Link>
                    . {t('legal.privacyStatement')}
                  </span>
                </label>
              </div>

              {/* Button and links with proper spacing (12px gap from consent checkbox) */}
              <div className="mt-3 flex flex-col space-y-3">
                {/* Main Button */}
                <Button
                  fullWidth
                  loading={isLoading}
                  loadingText={t('signup.signupButtonLoading')}
                  type="submit"
                  variant="auth"
                >
                  {t('signup.signupButton')}
                </Button>

                {/* Link Button (12px gap from main button via space-y-3) */}
                <LinkButton type="button" onClick={handleLoginClick}>
                  {t('signup.haveAccount')}
                </LinkButton>
              </div>
            </form>
          </ContentSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}
