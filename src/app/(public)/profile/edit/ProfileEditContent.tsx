'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Icon } from '@iconify/react';

import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Show success state on button
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
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Fehler beim Aktualisieren des Profils');
    } finally {
      setIsSubmitting(false);
    }
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
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top transition-all duration-500 ease-in-out ${
        isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.back()}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-content-title leading-[29px]">
              Profil bearbeiten
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col">
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4">
              <p className="text-center text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Persönliche Daten */}
        <div>
            <h2 className="mb-4 text-left font-inter-tight text-xl font-medium text-[#232323]">
              Persönliche Daten
            </h2>
          
          <div className="space-y-4">
            {/* First Name */}
            <div className="flex h-[54px] w-full min-w-[123.08px] min-h-[23.4px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
              <div className="flex w-full flex-col gap-1">
                <label className="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px] text-[#999999]">
                  Vorname
                </label>
                <input
                  required
                  className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="flex h-[54px] w-full min-w-[123.08px] min-h-[23.4px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
              <div className="flex w-full flex-col gap-1">
                <label className="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px] text-[#999999]">
                  Nachname
                </label>
                <input
                  required
                  className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex h-[54px] w-full min-w-[123.08px] min-h-[23.4px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
              <div className="flex w-full flex-col gap-1">
                <label className="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px] text-[#999999]">
                  E-Mail
                </label>
                <input
                  required
                  className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            {/* Password Field with Hint */}
            <div className="space-y-1">
              <div className="flex h-[54px] w-full min-w-[123.08px] min-h-[23.4px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
                <div className="flex w-full flex-col gap-1">
                  <label className="h-[15px] w-[47px] font-inter-tight text-xs font-normal leading-[15px] text-[#999999]">
                    Passwort
                  </label>
                  <input
                    className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                </div>
                
                {/* Eye Toggle Icon */}
                <button
                  className="flex h-[25px] w-[25px] items-center justify-center text-gray-500 hover:text-gray-700"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="pl-2 text-xs text-gray-500">
                Lass das Feld leer, um das Passwort nicht zu ändern.
              </p>
            </div>
          </div>
        </div>

          </form>

          {/* Konto verwalten */}
          <div className="mt-8 mb-6">
            <h2 className="mb-4 text-left font-inter-tight text-xl font-medium text-[#232323]">
              Konto verwalten
            </h2>
          
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
        </div>
      </div>

      {/* Custom Footer - replaces mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/10 backdrop-blur-3xl border-t border-white/20">
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4">
          <button
            className={`w-full rounded-xl py-3 font-inter font-semibold text-base text-white transition-all duration-300 disabled:opacity-50 ${
              isSaved 
                ? 'bg-[#4a8a84] hover:bg-[#4a8a84]' 
                : hasChanges()
                  ? 'bg-[#589D96] hover:bg-[#4a8a84]'
                  : 'bg-[#589D96] hover:bg-[#4a8a84] opacity-50'
            }`}
            disabled={isSubmitting || (!hasChanges() && !isSaved)}
            type="button"
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              'Speichern...'
            ) : isSaved ? (
              <div className="flex items-center justify-center gap-2">
                <Icon className="h-5 w-5" icon="lucide:check" />
                Gespeichert
              </div>
            ) : hasChanges() ? (
              'Änderungen speichern'
            ) : (
              'Keine Änderungen'
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
