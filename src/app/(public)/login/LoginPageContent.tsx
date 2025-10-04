'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { toast } from 'sonner';

interface FormData {
  email: string;
  password: string;
}

export function LoginPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/profile');
    }
  }, [user, router]);

  // Don't render if already logged in (to prevent flash)
  if (user) {
    return null;
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authService.signIn(formData.email, formData.password);
      
      toast.success('Erfolgreich angemeldet');
      router.push('/profile');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Anmeldung fehlgeschlagen. Bitte überprüfe deine Eingaben.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupClick = () => {
    router.push('/signup');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] px-4">
      {/* Header */}
      <div className="flex w-full max-w-[361px] flex-col items-center py-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-semibold text-content-title">Login</h1>
          <div className="h-12 w-12">
            <Logo className="h-12 w-12" height={48} width={48} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex w-full max-w-[361px] flex-1 flex-col items-center gap-6 overflow-y-auto pb-mobile-nav-md">
        {/* Title Section */}
        <div className="flex flex-col items-center gap-8">
          {/* Welcome Title */}
          <div className="flex flex-col items-start">
            <h2 className="text-left text-lg font-semibold leading-[39px] text-content-title">
              Willkommen bei Ummah Flow
            </h2>
            <p className="text-left text-sm leading-[19px] text-[#7A7A7A]">
              Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="flex w-full flex-col" onSubmit={handleSubmit}>
          {/* Form Fields */}
          <div className="flex w-full flex-col gap-3">
            {/* Email Field */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                E-Mail
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Email eingeben"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex h-[56px] w-full items-center justify-between rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                Passwort
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Passwort eingeben"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
              />
            </div>
            
            {/* Eye Toggle Icon */}
            <button
              className="flex h-6 w-6 items-center justify-center text-[#232323] hover:text-gray-700"
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

          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 pt-8">
            {/* Login Button */}
            <button
              className="flex h-[56px] w-full items-center justify-center rounded-[16.8px] bg-[#589D96] text-base font-medium leading-[24px] text-white transition-colors hover:bg-[#4a8a84] disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </button>

            {/* Register Link */}
            <button
              className="text-center text-base font-medium leading-[19px] text-[#589D96] hover:text-[#4a8a84]"
              type="button"
              onClick={handleSignupClick}
            >
              Noch kein Konto? Jetzt registrieren.
            </button>

            {/* Terms */}
            <p className="text-center text-[11px] leading-[13px] text-[#7A7A7A]">
              Wenn du fortfährst, erstellst du ein Konto und stimmst den Allgemeinen Geschäftsbedingungen und Datenschutzrichtlinien zu.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
