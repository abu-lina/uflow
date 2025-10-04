'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { toast } from 'sonner';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export function SignupPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user) {
    router.replace('/profile');
    return null;
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.email) {
      toast.error('Bitte gib eine E-Mail-Adresse ein');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen lang sein');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwörter stimmen nicht überein');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      await authService.signUp(formData.email, formData.password);
      
      toast.success('Registrierung erfolgreich! Bitte überprüfe deine E-Mails.');
      router.push('/login');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] px-4">
      {/* Header */}
      <div className="flex w-full max-w-[361px] flex-col items-center py-6">
        <div className="flex w-full items-center justify-between">
          <h1 className="text-xl font-semibold text-content-title">Registrieren</h1>
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
          <div className="flex flex-col items-start pl-3">
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
                placeholder="Mindestens 6 Zeichen"
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

          {/* Confirm Password Field */}
          <div className="flex h-[56px] w-full items-center justify-between rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-[#999999]">
                Passwort bestätigen
              </label>
              <input
                required
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-[#272727] focus:outline-none focus:ring-0"
                placeholder="Passwort wiederholen"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              />
            </div>
            
            {/* Eye Toggle Icon */}
            <button
              className="flex h-6 w-6 items-center justify-center text-[#232323] hover:text-gray-700"
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>

          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-4 pt-8">
            {/* Register Button */}
            <button
              className="flex h-[56px] w-full items-center justify-center rounded-[16.8px] bg-[#589D96] text-base font-medium leading-[24px] text-white transition-colors hover:bg-[#4a8a84] disabled:opacity-50"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Registrieren...' : 'Registrieren'}
            </button>

            {/* Login Link */}
            <button
              className="text-center text-base font-medium leading-[19px] text-[#589D96] hover:text-[#4a8a84]"
              type="button"
              onClick={handleLoginClick}
            >
              Bereits ein Konto? Jetzt anmelden.
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
