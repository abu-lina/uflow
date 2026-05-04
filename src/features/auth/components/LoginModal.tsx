'use client';

import { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { LinkButton } from '@/components/ui/LinkButton';
import { signInWithEmailConfirmation } from '@/lib/auth';
import { useLanguage } from '@/providers/LanguageProvider';
import EmailVerificationAlert from '@/components/ui/EmailVerificationAlert';

interface LoginModalProps {
  onClose: () => void;
  onSwitchMode?: () => void;
}

export function LoginModal({ onClose, onSwitchMode }: LoginModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailConfirmationError, setIsEmailConfirmationError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await signInWithEmailConfirmation(formData.email, formData.password);
      
      if (signInError) {
        if (signInError.message === 'EMAIL_NOT_CONFIRMED') {
          setError(t('login.emailNotConfirmed'));
          setIsEmailConfirmationError(true);
        } else if (signInError.message === 'EMAIL_NOT_FOUND') {
          setError(t('login.emailNotFound'));
          setIsEmailConfirmationError(false);
        } else {
          setError(t('login.invalidCredentials'));
          setIsEmailConfirmationError(false);
          toast.error(t('login.loginFailedToast'), {
            description: t('login.loginFailedDescription'),
            duration: 4000,
          });
        }
        return;
      }

      if (data) {
        onClose();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(t('login.unexpectedError'));
      setIsEmailConfirmationError(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!formData.email) {
      setError(t('login.enterEmailFirst'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const tokenResponse = await fetch('/api/generate-confirmation-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          type: 'signup',
        }),
      });

      if (!tokenResponse.ok) {
        setError(t('login.confirmationEmailFailed'));
        toast.error(t('login.emailFailedToast'), {
          description: t('login.emailFailedDescription'),
          duration: 4000,
        });
        return;
      }

      const { token } = await tokenResponse.json();
      const siteUrl = (typeof window !== 'undefined' ? window.location.origin : '') || process.env.NEXT_PUBLIC_SITE_URL || '';
      const confirmationUrl = `${siteUrl}/auth/confirm?token=${token}&email=${encodeURIComponent(formData.email)}`;

      const emailResponse = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.email,
          type: 'confirmSignup',
          language: 'de',
          confirmationUrl,
        }),
      });

      if (emailResponse.ok) {
        setError(t('login.confirmationEmailSent'));
        setIsEmailConfirmationError(false);
        toast.success(t('login.emailSentToast'), {
          description: t('login.emailSentDescription'),
          duration: 4000,
        });
      } else {
        setError(t('login.confirmationEmailFailed'));
        toast.error(t('login.emailFailedToast'), {
          description: t('login.emailFailedDescription'),
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      setError(t('login.confirmationEmailFailed'));
      toast.error(t('login.errorOccurredToast'), {
        description: t('login.errorOccurredDescription'),
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex h-[694px] w-[1142px] overflow-hidden rounded-3xl shadow-2xl">
        {/* Left Section */}
        <div className="relative flex h-full w-[571px] flex-col items-center justify-center rounded-l-3xl bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] p-[52px_49px]">
          {/* Logo and Decorative Elements */}
          <div className="relative flex size-[384px] items-center justify-center">
            <Logo
              className="absolute left-[7.39px] top-[7.39px] size-[369.23px]"
              height={369.23}
              width={369.23}
            />
          </div>
        </div>
        {/* Right Section */}
        <div className="flex h-full w-[571px] flex-col justify-center rounded-tr-[48px] bg-white p-16 overflow-y-auto">
          <div className="mb-8">
            <h1 className="font-inter-tight text-3xl font-semibold text-content-heading">
              {t('login.welcomeTitle')}
            </h1>
            <p className="mt-4 font-inter text-lg text-content-muted">
              {t('login.welcomeDescription')}
            </p>
          </div>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FormInputGroup gap="gap-3">
              <FormInput
                required
                disabled={isLoading}
                label={t('login.emailLabel')}
                placeholder={t('login.emailPlaceholder')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <FormInput
                required
                disabled={isLoading}
                label={t('login.passwordLabel')}
                placeholder={t('login.passwordPlaceholder')}
                rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                variant="with-icon"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onRightIconClick={() => setShowPassword(!showPassword)}
              />
            </FormInputGroup>
            
            {error && (
              <div className="mt-2">
                {isEmailConfirmationError ? (
                  <EmailVerificationAlert
                    message={error}
                    onResend={handleResendConfirmation}
                  />
                ) : (
                  <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4 shadow-sm">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-danger" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="font-inter-tight text-sm leading-[19px] text-danger">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              className="mt-3 w-full rounded-2xl bg-primary py-4 text-base font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? t('login.loginButtonLoading') : t('login.loginButton')}
            </button>
          </form>
          <div className="mt-8 flex w-full flex-col items-center gap-3">
            <p className="text-center text-[11px] leading-[13px] text-content-muted">
              {t('legal.privacyStatement')}
            </p>
            {onSwitchMode && (
              <LinkButton
                type="button"
                onClick={onSwitchMode}
              >
                {t('login.noAccount')}
              </LinkButton>
            )}
          </div>
        </div>
        {/* Close Button */}
        <button
          className="absolute right-8 top-8 z-20 flex size-8 items-center justify-center rounded-full hover:bg-neutral-light"
          onClick={onClose}
        >
          <svg
            className="size-8"
            fill="none"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M24 8L8 24M8 8l16 16"
              stroke="#232323"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}



