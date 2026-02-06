'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { LinkButton } from '@/components/ui/LinkButton';
import { signUpWithLanguage } from '@/lib/auth';
import { useLanguage } from '@/providers/LanguageProvider';

interface SignupModalProps {
  onClose: () => void;
  onSwitchMode?: () => void;
}

export function SignupModal({ onClose, onSwitchMode }: SignupModalProps) {
  const { language, t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    
    if (!termsAccepted || !privacyAccepted) {
      setError(t('legal.consentRequired') || 'Sie müssen den Allgemeinen Geschäftsbedingungen und der Datenschutzrichtlinie zustimmen.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: signupError } = await signUpWithLanguage(
        formData.email,
        formData.password,
        language,
        undefined, // honeypot
        termsAccepted,
        privacyAccepted
      );
      
      if (signupError) {
        setError(signupError.message || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
        setIsLoading(false);
        return;
      }
      
      if (data) {
        onClose();
      }
    } catch (error) {
      console.error('Signup error:', error);
      setError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
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
            {/* Add decorative elements here if needed, using absolute positioning as in Figma */}
          </div>
        </div>
        {/* Right Section */}
        <div className="flex h-full w-[571px] flex-col justify-center rounded-tr-[48px] bg-white p-16">
          <div className="mb-8">
            <h1 className="font-inter-tight text-3xl font-semibold text-content-heading">
              Willkommen bei Ummah Flow
            </h1>
            <p className="mt-4 font-inter text-lg text-content-muted">
              Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
            </p>
          </div>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <FormInputGroup gap="gap-3">
              <FormInput
                required
                disabled={isLoading}
                label="E-Mail"
                placeholder="Email eingeben"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <FormInput
                required
                autoComplete="new-password"
                disabled={isLoading}
                label="Passwort"
                placeholder="Mindestens 8 Zeichen, Buchstabe und Zahl"
                rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                variant="with-icon"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onRightIconClick={() => setShowPassword(!showPassword)}
              />
              <FormInput
                required
                autoComplete="new-password"
                disabled={isLoading}
                label="Passwort bestätigen"
                placeholder="Passwort wiederholen"
                rightIcon={showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                variant="with-icon"
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </FormInputGroup>
            
            {/* Error Message */}
            {error && (
              <div className="mt-2">
                <div className="rounded-2xl border border-danger/20 bg-danger-soft p-4 shadow-sm">
                  <p className="font-inter-tight text-sm leading-[19px] text-danger">
                    {error}
                  </p>
                </div>
              </div>
            )}
            
            {/* Consent Checkbox */}
            <div className="mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  required
                  aria-label={t('legal.acceptTerms') || 'Accept Terms of Service and Privacy Policy'}
                  aria-required="true"
                  checked={termsAccepted && privacyAccepted}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-2 flex-shrink-0"
                  disabled={isLoading}
                  type="checkbox"
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    setPrivacyAccepted(e.target.checked);
                  }}
                />
                <span className="text-[11px] leading-[13px] text-content-muted">
                  {t('legal.acceptTermsText') || 'Ich akzeptiere die '}
                  <Link className="underline hover:text-primary" href="/terms">
                    {t('legal.termsOfService') || 'Allgemeinen Geschäftsbedingungen'}
                  </Link>
                  {' '}{t('legal.and') || 'und'}{' '}
                  <Link className="underline hover:text-primary" href="/privacy-policy">
                    {t('legal.privacyPolicy') || 'Datenschutzrichtlinie'}
                  </Link>
                  . {t('legal.privacyStatement') || 'Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.'}
                </span>
              </label>
            </div>
            
            <button
              className="mt-3 w-full rounded-2xl bg-primary py-4 text-base font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Wird registriert...' : 'Registrieren'}
            </button>
          </form>
          {onSwitchMode && (
            <div className="mt-8 flex w-full justify-center">
              <LinkButton
                type="button"
                onClick={onSwitchMode}
              >
                Bereits ein Konto? Jetzt anmelden.
              </LinkButton>
            </div>
          )}
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
