'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Icon } from '@iconify/react';

import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form data from user
  useEffect(() => {
    if (effectiveUser) {
      const fullName = effectiveUser.user_metadata?.full_name ?? '';
      const nameParts = fullName.split(' ');
      
      setFormData({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: effectiveUser.email || '',
        password: '',
      });
    }
  }, [effectiveUser]);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      router.replace('/?auth=required');
    }
  }, [effectiveUser, loading, router]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

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

      setSuccess('Profil erfolgreich aktualisiert');
      
      // Redirect back to profile after a short delay
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

  const handleCloseAccount = async () => {
    if (!confirm('Sind Sie sicher, dass Sie Ihr Konto schließen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await authService.deleteUser();
      router.push('/?auth=required');
    } catch (err) {
      console.error('Error closing account:', err);
      setError('Fehler beim Schließen des Kontos');
    }
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
    <div className="px-4 pb-8 pt-6">
      {/* Header */}
      <div className="mb-6 flex h-12 w-full items-center">
        {/* Left side: Chevron + Title */}
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center"
          >
            <Icon icon="material-symbols:chevron-left" className="h-8 w-8 text-[#272727]" />
          </button>
          <h1 className="ml-2 font-inter-tight text-2xl font-bold text-[#232323]">
            Profil bearbeiten
          </h1>
        </div>

        {/* Profile Avatar */}
        <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-[33.6px] bg-[#589D96] p-[9.6px]">
          <Icon icon="lucide:user" className="h-[40.8px] w-[40.8px] text-white" />
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4">
          <p className="text-center text-green-600">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <p className="text-center text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Persönliche Daten */}
        <div>
            <h2 className="mb-4 text-left font-inter-tight text-xl font-medium text-[#232323]" style={{ fontSize: '20px' }}>
              Persönliche Daten
            </h2>
          
          <div className="space-y-4">
            {/* First Name */}
            <div className="flex h-[54px] w-full min-w-[123.08px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3">
              {/* Label and Value Container */}
              <div className="flex flex-1 flex-col items-start justify-center gap-1">
                <label className="font-inter-tight text-xs text-[#999999]">
                  Vorname
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium text-[#272727] focus:outline-none focus:ring-0 focus:border-none"
                  placeholder=""
                  required
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="flex h-[54px] w-full min-w-[123.08px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3">
              {/* Label and Value Container */}
              <div className="flex flex-1 flex-col items-start justify-center gap-1">
                <label className="font-inter-tight text-xs text-[#999999]">
                  Nachname
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium text-[#272727] focus:outline-none focus:ring-0 focus:border-none"
                  placeholder=""
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex h-[54px] w-full min-w-[123.08px] items-center rounded-2xl border border-[#D4D4D4] bg-white px-3">
              {/* Label and Value Container */}
              <div className="flex flex-1 flex-col items-start justify-center gap-1">
                <label className="font-inter-tight text-xs text-[#999999]">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium text-[#272727] focus:outline-none focus:ring-0 focus:border-none"
                  placeholder=""
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex h-[54px] w-full min-w-[123.08px] items-center justify-between rounded-2xl border border-[#D4D4D4] bg-white px-3">
              {/* Label and Value Container */}
              <div className="flex flex-1 flex-col items-start justify-center gap-1">
                <label className="font-inter-tight text-xs text-[#999999]">
                  Passwort
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium text-[#272727] focus:outline-none focus:ring-0 focus:border-none"
                  placeholder=""
                />
              </div>
              {/* Password Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Lassen Sie das Feld leer, um das Passwort nicht zu ändern
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#589D96] py-3 font-inter font-semibold text-white transition-colors hover:bg-[#4a8a84] disabled:opacity-50"
        >
          {isSubmitting ? 'Speichern...' : 'Änderungen speichern'}
        </button>
      </form>

        {/* Konto verwalten */}
        <div className="mt-8">
          <h2 className="mb-4 text-left font-inter-tight text-xl font-medium text-[#232323]" style={{ fontSize: '20px' }}>
            Konto verwalten
          </h2>
        
        <button
          onClick={handleCloseAccount}
          className="flex h-[54px] w-full flex-col items-start justify-center gap-4 rounded-xl border border-[#D4D4D4] bg-white p-4"
        >
          <div className="flex h-6 w-full items-center gap-3">
            <Icon icon="iconamoon:heart-off" className="h-6 w-6 text-black" />
            <span className="font-inter-tight text-base font-semibold text-[#232323]">
              Konto schließen
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
