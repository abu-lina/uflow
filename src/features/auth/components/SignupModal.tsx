import { useState } from 'react';

import { toast } from 'sonner';

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
        <div className="flex h-full w-[571px] flex-col justify-center rounded-tr-[48px] bg-white p-16">
          <div className="mb-8">
            <h1 className="font-inter-tight text-[40px] font-semibold leading-[1.1] text-[#232323]">
              Willkommen bei
              <br />
              Ummah Flow
            </h1>
            <p className="mt-4 font-inter text-xl text-[#8C8C8C]">
              Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
            </p>
          </div>
          <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
            <input
              required
              className="w-full border-0 border-b border-[#E5E5E5] bg-transparent px-0 py-4 text-xl text-[#232323] placeholder:text-[#B0B0B0] focus:border-[#589D96] focus:ring-0"
              disabled={isLoading}
              id="email"
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              required
              className="w-full border-0 border-b border-[#E5E5E5] bg-transparent px-0 py-4 text-xl text-[#232323] placeholder:text-[#B0B0B0] focus:border-[#589D96] focus:ring-0"
              disabled={isLoading}
              id="password"
              placeholder="Passwort"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
            <input
              required
              className="w-full border-0 border-b border-[#E5E5E5] bg-transparent px-0 py-4 text-xl text-[#232323] placeholder:text-[#B0B0B0] focus:border-[#589D96] focus:ring-0"
              disabled={isLoading}
              id="confirmPassword"
              placeholder="Passwort wiederholen"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
            <button
              className="mt-4 w-full rounded-2xl bg-mint py-4 text-xl font-medium text-white"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? 'Wird registriert...' : 'Registrieren'}
            </button>
          </form>
          <p className="mt-8 w-full text-center font-inter text-xs font-light text-grey">
            Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.
          </p>
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
