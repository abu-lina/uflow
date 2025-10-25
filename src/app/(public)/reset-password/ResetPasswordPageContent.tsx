'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { TitleAndText, FormInput, FormInputGroup, Button, LinkButton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

interface FormData {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const handleInputChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // Get token and email from URL params
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (!tokenParam || !emailParam) {
      setError(language === 'de' 
        ? 'Ungültiger oder fehlender Reset-Link. Bitte fordere einen neuen Link an.'
        : 'Invalid or missing reset link. Please request a new link.'
      );
      return;
    }
    
    setToken(tokenParam);
    setEmail(emailParam);
  }, [searchParams, language]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.replace(decodeURIComponent(returnUrl));
      } else {
        router.replace('/profile');
      }
    }
  }, [user, router, searchParams]);

  // Don't render if already logged in (to prevent flash)
  if (user) {
    return null;
  }

  const validateForm = () => {
    if (!formData.password) {
      setError(language === 'de' ? 'Bitte gib ein neues Passwort ein.' : 'Please enter a new password.');
      return false;
    }
    if (formData.password.length < 6) {
      setError(language === 'de' ? 'Das Passwort muss mindestens 6 Zeichen lang sein.' : 'Password must be at least 6 characters long.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(language === 'de' ? 'Die Passwörter stimmen nicht überein.' : 'Passwords do not match.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !token || !email) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || (language === 'de' ? 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.' : 'An error occurred. Please try again.'));
        setIsLoading(false);
        return;
      }
      
      // Success
      setIsSuccess(true);
      setIsLoading(false);
      
      // Show success toast
      toast.success(
        language === 'de' ? 'Passwort aktualisiert' : 'Password updated',
        {
          description: language === 'de' 
            ? 'Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt anmelden.'
            : 'Your password has been successfully updated. You can now log in.',
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Password reset error:', error);
      setError(language === 'de' ? 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.' : 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleRequestNewLink = () => {
    if (email) {
      router.push(`/forgot-password?email=${encodeURIComponent(email)}`);
    } else {
      router.push('/forgot-password');
    }
  };

  if (!token || !email) {
    return (
      <PageLayout hasBackground={false}>
        <PageHeader
          title={language === 'de' ? 'Ungültiger Link' : 'Invalid Link'}
          variant="back-and-title"
          onBack={handleBackToLogin}
        />
        
        <HeaderSpacer />
        
        <PageContentWrapper>
          <div className="flex w-full flex-col">
            <TitleSection>
              <TitleAndText
                description={language === 'de' 
                  ? 'Der Passwort-Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'
                  : 'The password reset link is invalid or expired. Please request a new link.'
                }
                title={language === 'de' ? 'Ungültiger Link' : 'Invalid Link'}
              />
            </TitleSection>

            <ContentSection>
              <div className="flex w-full flex-col items-center text-center">
                {/* Error Icon */}
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>

                {/* Action Buttons */}
                <div className="flex w-full flex-col gap-3">
                  <Button
                    fullWidth
                    variant="auth"
                    onClick={handleRequestNewLink}
                  >
                    {language === 'de' ? 'Neuen Link anfordern' : 'Request new link'}
                  </Button>

                  <LinkButton
                    type="button"
                    onClick={handleBackToLogin}
                  >
                    {language === 'de' ? 'Zurück zur Anmeldung' : 'Back to login'}
                  </LinkButton>
                </div>
              </div>
            </ContentSection>
          </div>
        </PageContentWrapper>
      </PageLayout>
    );
  }

  return (
    <PageLayout hasBackground={false}>
      <PageHeader
        title={language === 'de' ? 'Neues Passwort setzen' : 'Set new password'}
        variant="back-and-title"
        onBack={handleBackToLogin}
      />
      
      <HeaderSpacer />
      
      <PageContentWrapper centerVertically={true} contentClassName="gap-10">
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description={language === 'de' 
              ? 'Gib dein neues Passwort ein. Es muss mindestens 6 Zeichen lang sein.'
              : 'Enter your new password. It must be at least 6 characters long.'
            }
            title={language === 'de' ? 'Neues Passwort setzen' : 'Set new password'}
          />
        </TitleSection>

        {/* Form Content with exact spacing structure */}
        <div className="flex w-full flex-col">
          <ContentSection>
            {!isSuccess ? (
              <form className="flex w-full flex-col" onSubmit={handleSubmit}>
                {/* Password Input Fields */}
                <FormInputGroup gap="gap-3">
                  <FormInput
                    required
                    label={language === 'de' ? 'Neues Passwort' : 'New password'}
                    placeholder={language === 'de' ? 'Neues Passwort eingeben' : 'Enter new password'}
                    rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    variant="with-icon"
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                  />
                  <FormInput
                    required
                    label={language === 'de' ? 'Passwort bestätigen' : 'Confirm password'}
                    placeholder={language === 'de' ? 'Passwort bestätigen' : 'Confirm password'}
                    rightIcon={showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                    <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4 shadow-sm">
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
                  </div>
                )}

                {/* Submit Button */}
                <div className="mt-6">
                  <Button
                    fullWidth
                    loading={isLoading}
                    loadingText={language === 'de' ? 'Passwort wird aktualisiert...' : 'Updating password...'}
                    type="submit"
                    variant="auth"
                  >
                    {language === 'de' ? 'Passwort aktualisieren' : 'Update password'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex w-full flex-col items-center text-center">
                {/* Success Icon */}
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>

                {/* Success Message */}
                <div className="mb-8">
                  <h2 className="mb-3 text-xl font-semibold text-content-title">
                    {language === 'de' ? 'Passwort aktualisiert!' : 'Password updated!'}
                  </h2>
                  <p className="text-content text-base leading-6">
                    {language === 'de' 
                      ? 'Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt mit deinem neuen Passwort anmelden.'
                      : 'Your password has been successfully updated. You can now log in with your new password.'
                    }
                  </p>
                </div>

                {/* Action Button */}
                <div className="w-full">
                  <Button
                    fullWidth
                    variant="auth"
                    onClick={handleBackToLogin}
                  >
                    {language === 'de' ? 'Zur Anmeldung' : 'Go to login'}
                  </Button>
                </div>
              </div>
            )}
          </ContentSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}
