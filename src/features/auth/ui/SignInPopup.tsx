import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface SignInPopupProps {
  onClose: () => void;
  onForgotPassword?: () => void;
}

export function SignInPopup({ onClose, onForgotPassword }: SignInPopupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim() || !password) {
      toast.error('Bitte fülle alle Felder aus.');
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Bitte gib eine gültige E-Mail-Adresse ein.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Anmeldung fehlgeschlagen.');
    } else {
      toast.success('Willkommen zurück!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="relative flex h-[694px] w-[1142px] overflow-hidden rounded-[48px] bg-transparent shadow-2xl">
        {/* Close Button */}
        <button
          aria-label="Close"
          className="absolute right-8 top-8 z-10 rounded-full p-2 transition hover:bg-gray-100"
          onClick={onClose}
        >
          <XMarkIcon className="h-8 w-8 text-neutral-800" />
        </button>

        {/* Left Section */}
        <div className="flex h-full w-[571px] flex-col items-center justify-center gap-[66px] rounded-l-[48px] bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] p-[52px_49px]">
          <div className="relative flex h-[384px] w-[384px] items-center justify-center">
            <Logo height={369} width={369} />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex h-full w-[571px] flex-col items-start justify-center gap-[39px] rounded-r-[48px] bg-white p-[80px_48px]">
          {/* Header */}
          <div className="flex w-[475px] flex-col gap-8">
            <div className="flex w-full flex-col items-center justify-center gap-2">
              <h2 className="font-inter-tight w-full text-[32px] font-semibold leading-[39px] text-[#232323]">
                Willkommen zurück bei Ummah Flow
              </h2>
              <p className="font-inter w-full text-base text-[#7A7A7A]">
                Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="flex w-[475px] flex-col gap-4" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label className="mb-2 block text-base text-[#CDCDCD]">Email</label>
              <input
                disabled={loading}
                required
                type="email"
                value={email}
                placeholder="deine@email.de"
                className="w-full border-0 border-b border-[#CDCDCD] bg-transparent focus:border-[#589D96] focus:ring-0 py-2"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            {/* Password */}
            <div>
              <label className="mb-2 block text-base text-[#CDCDCD]">Passwort</label>
              <input
                disabled={loading}
                required
                type="password"
                value={password}
                placeholder="Passwort"
                className="w-full border-0 border-b border-[#CDCDCD] bg-transparent focus:border-[#589D96] focus:ring-0 py-2"
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            {/* Submit Button */}
            <button
              className="mt-6 h-14 w-full rounded-[16.8px] bg-[#589D96] font-inter-tight text-[20px] font-medium text-white flex items-center justify-center disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <span className="loader border-2 border-t-2 border-white border-t-[#DBF7F4] rounded-full w-6 h-6 animate-spin mr-2" />
              ) : null}
              Anmelden
            </button>
          </form>

          {/* Forgot Password */}
          <button
            tabIndex={0}
            type="button"
            className="w-full text-right text-[16px] font-inter-tight font-light text-black underline mt-2"
            onClick={onForgotPassword}
          >
            Passwort vergessen?
          </button>
        </div>
      </div>
    </div>
  );
} 