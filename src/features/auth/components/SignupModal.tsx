import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface SignupModalProps {
  onClose: () => void;
}

export function SignupModal({ onClose }: SignupModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (error) {
        throw error;
      }
      toast.success('Registrierung erfolgreich. Bitte bestätige deine Email-Adresse.');
      onClose();
    } catch (error) {
      toast.error('Registrierung fehlgeschlagen. Bitte überprüfe deine Eingaben.');
    } finally {
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
        <div className="relative z-10 flex h-full w-[571px] flex-col items-start justify-center gap-[39px] rounded-r-3xl bg-white p-[80px_48px]">
          <form className="flex w-full flex-col gap-[39px]" onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex w-[475px] flex-col gap-8">
              <h1 className="w-full font-inter-tight text-[32px] font-semibold leading-[39px] text-text">
                Willkommen bei Ummah Flow
              </h1>
              <p className="w-full font-inter text-base text-grey">
                Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
              </p>
            </div>
            {/* Form Fields */}
            <div className="flex w-[475px] flex-col gap-8">
              <Input
                required
                disabled={isLoading}
                id="email"
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <div className="flex w-full gap-[39px]">
                <Input
                  required
                  className="w-[218px]"
                  disabled={isLoading}
                  id="password"
                  label="Passwort"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <Input
                  required
                  className="w-[218px]"
                  disabled={isLoading}
                  id="confirmPassword"
                  label="Passwort wiederholen"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
            {/* Submit Button */}
            <Button
              className="flex h-14 w-[475px] items-center justify-center rounded-[16.8px] bg-mint px-5 font-inter-tight text-lg font-medium leading-[24px] text-white"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Wird registriert...' : 'Registrieren'}
            </Button>
            {/* Privacy Notice */}
            <p className="w-[475px] text-center font-inter text-[8px] font-light text-grey">
              Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.
            </p>
          </form>
        </div>
        {/* Close Button */}
        <button
          className="absolute right-8 top-8 z-20 flex size-8 items-center justify-center rounded-full hover:bg-grey-light"
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
