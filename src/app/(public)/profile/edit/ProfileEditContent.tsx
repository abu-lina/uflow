'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { ContentSection } from '@/components/layout/ContentSection';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
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
  const { user: clientUser, loading } = useAuth();
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
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);

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

  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

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
      setError('Fehler beim Aktualisieren des Profils');
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
          <div className="mb-4 text-2xl">🔄</div>
          <p className="text-gray-600">Überprüfe Anmeldung...</p>
        </div>
      </div>
    );
  }

  // Show authentication required if no user
  if (!effectiveUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl">🔐</div>
          <p className="text-gray-600">Anmeldung erforderlich</p>
        </div>
      </div>
    );
  }


  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader 
        isVisible={isHeaderSticky}
        title="Profil bearbeiten"
        variant="back-and-title"
        onBack={() => router.back()}
      />

      <HeaderSpacer isVisible={isHeaderSticky} />

      <PageContentWrapper 
        className="content-scroll-container flex-1 mobile-nav-spacing overflow-y-auto"
      >
        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <p className="text-center text-red-600">{error}</p>
          </div>
        )}

        {/* Persönliche Daten Section */}
        <ContentSection>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <SectionHeading>
                Persönliche Daten
              </SectionHeading>
            
              <div className="space-y-3">
                {/* First Name */}
                <FormInput
                  required
                  label="Vorname"
                  labelClassName="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px]"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />

                {/* Last Name */}
                <FormInput
                  required
                  label="Nachname"
                  labelClassName="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px]"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />

                {/* Email */}
                <FormInput
                  required
                  label="E-Mail"
                  labelClassName="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px]"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />

                {/* Password Field with Hint */}
                <div className="space-y-1">
                  <FormInput
                    label="Passwort"
                    labelClassName="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px]"
                    rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    variant="with-icon"
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                  />
                  <p className="pl-2 text-xs text-gray-500">
                    Lass das Feld leer, um das Passwort nicht zu ändern.
                  </p>
                </div>
              </div>
            </div>
          </form>
        </ContentSection>

        {/* Konto verwalten Section */}
        <ContentSection className="mt-8 mb-6">
          <div>
            <SectionHeading>
              Konto verwalten
            </SectionHeading>
          
            <button
              className="flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#D4D4D4] bg-white px-4"
              onClick={handleCloseAccount}
            >
              <BrokenHeartIcon size={24} />
              <span className="font-inter-tight text-base font-semibold text-[#232323]">
                Konto schließen
              </span>
            </button>
          </div>
        </ContentSection>
      </PageContentWrapper>

      {/* Bottom Action Navbar */}
      <BottomActionNavbar
        height="h-16"
        primaryButton={{
          label: isSaved ? 'Gespeichert' : hasChanges() ? 'Änderungen speichern' : 'Keine Änderungen',
          icon: isSaved ? 'lucide:check' : 'lucide:save',
          onClick: submitForm,
          disabled: isSaved || isSubmitting || !hasChanges(),
          loading: isSubmitting,
          loadingText: 'Speichern...',
          variant: isSaved ? 'success' : 'primary',
          'aria-label': isSaved ? 'Gespeichert' : 'Änderungen speichern',
        }}
      />

    </div>
  );
}
