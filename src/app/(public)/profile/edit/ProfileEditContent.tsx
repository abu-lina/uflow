'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { ContentSection } from '@/components/layout/ContentSection';
import { BottomSpacer } from '@/components/layout/BottomSpacer';
import { useAuth } from '@/providers/auth-provider';
import { authService } from '@/features/auth/services/authService';
import { useLanguage } from '@/providers/LanguageProvider';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';
import { BottomActionNavbar } from '@/components/ui/BottomActionNavbar';
import { FormInput } from '@/components/ui/FormInput';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { SupabaseUser } from '@/types/supabase-user';

interface ProfileEditContentProps {
  user: SupabaseUser | null;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function ProfileEditContent({ user }: ProfileEditContentProps) {
  const { user: clientUser, isLoading: loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  // Use client-side user if server-side user is null
  const effectiveUser: SupabaseUser | null = user || (clientUser as SupabaseUser | null);
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  // Initialize form data from user
  useEffect(() => {
    if (effectiveUser) {
      const fullName = effectiveUser.user_metadata?.full_name ?? '';
      const nameParts = fullName.split(' ');
      
      const initialData = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: effectiveUser.email || '',
        password: '',
      };
      
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [effectiveUser]);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      router.replace('/login');
    }
  }, [effectiveUser, loading, router]);


  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!originalData) return false;
    
    return (
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.email !== originalData.email ||
      formData.password.trim() !== ''
    );
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    setError(null);
    setIsSaved(false);

    try {
      // Update user metadata if name changed
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const currentFullName = effectiveUser?.user_metadata?.full_name ?? '';
      
      if (fullName !== currentFullName) {
        await authService.updateUser({
          data: {
            full_name: fullName,
          },
        });
      }

      // Update email if changed
      if (formData.email !== effectiveUser?.email) {
        await authService.updateUser({
          email: formData.email,
        });
      }

      // Update password if provided
      if (formData.password.trim()) {
        await authService.updateUser({
          password: formData.password,
        });
      }

      // Show success state on button briefly, then redirect
      setIsSaved(true);
      
      // Update original data to current form data (excluding password)
      setOriginalData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: '',
      });
      
      // Clear password field after successful save
      setFormData(prev => ({ ...prev, password: '' }));
      
      // Redirect to profile page after a brief success state
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t('profile.errorUpdatingProfile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  const handleCloseAccount = () => {
    router.push('/profile/delete');
  };

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-gray-600 mx-auto" />
          <p className="text-gray-600">{t('profile.checkingAuth')}</p>
        </div>
      </div>
    );
  }

  // Show authentication required if no user
  if (!effectiveUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Lock className="mb-4 h-8 w-8 text-gray-600 mx-auto" />
          <p className="text-gray-600">{t('profile.authRequired')}</p>
        </div>
      </div>
    );
  }


  return (
    <PageLayout hasBackground={false} maxWidth="full">
      <PageHeader 
        title={t('profile.editProfile')}
        variant="back-and-title"
        onBack={() => router.back()}
      />

      <HeaderSpacer />

      <PageContentWrapper includeMobileNavSpacing={false} maxWidth="full" padding="lg-safe">
        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <p className="text-center text-red-600">{error}</p>
          </div>
        )}

        {/* Personal Data Section */}
        <ContentSection>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <SectionHeading>
                {t('profile.personalData')}
              </SectionHeading>
            
              <div className="space-y-3">
                {/* First Name */}
                <FormInput
                  required
                  label={t('profile.firstName')}
                  labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />

                {/* Last Name */}
                <FormInput
                  required
                  label={t('profile.lastName')}
                  labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />

                {/* Email */}
                <FormInput
                  required
                  label={t('profile.email')}
                  labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />

                {/* Password Field with Hint */}
                <div className="space-y-1">
                  <FormInput
                    label={t('profile.password')}
                    labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                    rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    variant="with-icon"
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                  />
                  <p className="pl-2 text-xs text-gray-500">
                    {t('profile.passwordHint')}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </ContentSection>

        {/* Manage Account Section */}
        <ContentSection className="mt-8 mb-6">
          <div>
            <SectionHeading>
              {t('profile.manageAccount')}
            </SectionHeading>
          
            <button
              className="flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#D4D4D4] bg-white px-4"
              onClick={handleCloseAccount}
            >
              <BrokenHeartIcon size={24} />
              <span className="font-inter-tight text-base font-semibold text-[#232323]">
                {t('profile.closeAccount')}
              </span>
            </button>
          </div>
        </ContentSection>
      </PageContentWrapper>

      <BottomSpacer />

      {/* Bottom Action Navbar */}
      <BottomActionNavbar
        height="h-16"
        primaryButton={{
          label: isSaved ? t('actions.saved') : hasChanges() ? t('actions.saveChanges') : t('actions.noChanges'),
          icon: isSaved ? 'lucide:check' : 'lucide:save',
          onClick: submitForm,
          disabled: isSaved || isSubmitting || !hasChanges(),
          loading: isSubmitting,
          loadingText: t('actions.saving'),
          variant: isSaved ? 'success' : 'primary',
          'aria-label': isSaved ? t('actions.saved') : t('actions.saveChanges'),
        }}
      />
    </PageLayout>
  );
}
