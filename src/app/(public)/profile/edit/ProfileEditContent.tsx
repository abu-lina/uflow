'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Icon } from '@iconify/react';

import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { accountService } from '@/services/account';
import { AccountDeletionModal } from '@/components/shared/AccountDeletionModal';
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleCloseAccount = () => {
    setShowDeleteModal(true);
  };

  const handleKeepAccount = () => {
    setShowDeleteModal(false);
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    setIsSubmitting(true);
    setError(null);

    try {
      if (!effectiveUser?.id) {
        throw new Error('User ID not found');
      }

      // Perform hard deletion from database
      await accountService.deleteAccount(effectiveUser.id);
      
      // Sign out the user
      await authService.signOut();
      
      // Redirect to home page
      router.push('/?auth=required');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Kontos');
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-gray-100 px-4 pb-mobile-nav-md pt-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex h-12 w-full items-center">
        {/* Left side: Chevron + Title */}
        <div className="flex items-center">
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.back()}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="ml-2 font-inter-tight text-xl font-bold text-[#232323]">
            Profil bearbeiten
          </h1>
        </div>

        {/* Profile Avatar */}
        <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-[33.6px] bg-[#589D96] p-[9.6px]">
          <Icon className="h-[40.8px] w-[40.8px] text-white" icon="lucide:user" />
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

        {/* Submit Button */}
        <button
          className="w-full rounded-xl bg-[#589D96] py-3 font-inter font-semibold text-white transition-colors hover:bg-[#4a8a84] disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Speichern...' : 'Änderungen speichern'}
        </button>
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

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isDeleting={isSubmitting}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleteAccount={handleDeleteAccount}
        onKeepAccount={handleKeepAccount}
      />
    </div>
  );
}
