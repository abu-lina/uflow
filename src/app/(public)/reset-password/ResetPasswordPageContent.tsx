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
import { TitleAndText } from '@/components/ui/TitleAndText';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { Button } from '@/components/ui/Button';
import { LinkButton } from '@/components/ui/LinkButton';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';

interface FormData {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();
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

  const mapResetPasswordError = (errorMessage?: string | null) => {
    if (errorMessage === 'EMAIL_NOT_FOUND') {
      return t('resetPassword.emailNotFound');
    }

    if (errorMessage === 'INVALID_OR_EXPIRED_TOKEN') {
      return t('resetPassword.invalidLinkError');
    }

    return t('resetPassword.genericError');
  };

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
      setError(t('resetPassword.invalidLinkError'));
      return;
    }
    
    setToken(tokenParam);
    setEmail(emailParam);
  }, [searchParams, t]);

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
      setError(t('resetPassword.newPasswordRequired'));
      return false;
    }
    if (formData.password.length < 6) {
      setError(t('resetPassword.passwordMinLength'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('resetPassword.passwordsMismatch'));
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
        setError(mapResetPasswordError(data.error));
        setIsLoading(false);
        return;
      }
      
      // Success
      setIsSuccess(true);
      setIsLoading(false);
      
      // Show success toast
      toast.success(
        t('resetPassword.successToastTitle'),
        {
          description: t('resetPassword.successToastDescription'),
          duration: 5000,
        }
      );
    } catch (error) {
      console.error('Password reset error:', error);
      setError(t('resetPassword.genericError'));
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
          title={t('resetPassword.invalidLinkTitle')}
          variant="back-and-title"
          onBack={handleBackToLogin}
        />
        
        <HeaderSpacer />
        
        <PageContentWrapper>
          <div className="flex w-full flex-col">
            <TitleSection>
              <TitleAndText
                description={t('resetPassword.invalidLinkDescription')}
                title={t('resetPassword.invalidLinkTitle')}
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
                    {t('resetPassword.requestNewLink')}
                  </Button>

                  <LinkButton
                    type="button"
                    onClick={handleBackToLogin}
                  >
                    {t('resetPassword.backToLogin')}
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
        title={t('resetPassword.pageTitle')}
        variant="back-and-title"
        onBack={handleBackToLogin}
      />
      
      <HeaderSpacer />
      
      <PageContentWrapper centerVertically={true} contentClassName="gap-10" includeMobileNavSpacing={true}>
        {/* Title + Paragraph with proper spacing */}
        <TitleSection>
          <TitleAndText
            description={t('resetPassword.heroDescription')}
            title={t('resetPassword.heroTitle')}
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
                    label={t('resetPassword.newPasswordLabel')}
                    placeholder={t('resetPassword.newPasswordPlaceholder')}
                    rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    variant="with-icon"
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                  />
                  <FormInput
                    required
                    label={t('resetPassword.confirmPasswordLabel')}
                    placeholder={t('resetPassword.confirmPasswordPlaceholder')}
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
                    loadingText={t('resetPassword.updateLoading')}
                    type="submit"
                    variant="auth"
                  >
                    {t('resetPassword.updateSubmit')}
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
                  <h2 className="mb-3 text-xl font-semibold text-content-heading">
                    {t('resetPassword.successTitle')}
                  </h2>
                  <p className="text-content text-base leading-6">
                    {t('resetPassword.successDescription')}
                  </p>
                </div>

                {/* Action Button */}
                <div className="w-full">
                  <Button
                    fullWidth
                    variant="auth"
                    onClick={handleBackToLogin}
                  >
                    {t('resetPassword.goToLogin')}
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
