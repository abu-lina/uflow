import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

import { Logo } from '@/components/ui/Logo';
import { supabase } from '@/lib/supabase/client';

interface SignupPopupProps {
  onClose: () => void;
}

export function SignupPopup({ onClose }: SignupPopupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim() || !email.trim() || !password || !passwordRepeat) {
      toast.error('Bitte fülle alle Felder aus.');
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error('Bitte gib eine gültige E-Mail-Adresse ein.');
      return false;
    }
    if (password.length < 6) {
      toast.error('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return false;
    }
    if (password !== passwordRepeat) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Registrierung fehlgeschlagen.');
    } else {
      toast.success('Registrierung erfolgreich! Bitte bestätige deine E-Mail.');
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
            {/* Add any extra illustration layers here if needed */}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex h-full w-[571px] flex-col items-start justify-center gap-[39px] rounded-r-[48px] bg-white p-[80px_48px]">
          {/* Header */}
          <div className="flex w-[475px] flex-col gap-8">
            <div className="flex w-full flex-col items-center justify-center gap-2">
              <h2 className="font-inter-tight w-full text-[32px] font-semibold leading-[39px] text-[#232323]">
                Willkommen bei Ummah Flow
              </h2>
              <p className="font-inter w-full text-base text-[#7A7A7A]">
                Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="flex w-[475px] flex-col gap-4" onSubmit={handleSubmit}>
            {/* Name */}
            <div>
              <label className="mb-2 block text-base text-[#CDCDCD]">User Name*</label>
              <input
                disabled={loading}
                required
                type="text"
                value={name}
                placeholder="Dein Name"
                className="w-full border-0 border-b border-[#CDCDCD] bg-transparent focus:border-[#589D96] focus:ring-0 py-2"
                onChange={e => setName(e.target.value)}
              />
            </div>
            {/* Email */}
            <div>
              <label className="mb-2 block text-base text-[#CDCDCD]">Email*</label>
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
            {/* Passwords */}
            <div className="flex gap-[39px]">
              <div className="flex-1">
                <label className="mb-2 block text-base text-[#CDCDCD]">Passwort*</label>
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
              <div className="flex-1">
                <label className="mb-2 block text-base text-[#CDCDCD]">Passwort wiederholen*</label>
                <input
                  disabled={loading}
                  required
                  type="password"
                  value={passwordRepeat}
                  placeholder="Passwort wiederholen"
                  className="w-full border-0 border-b border-[#CDCDCD] bg-transparent focus:border-[#589D96] focus:ring-0 py-2"
                  onChange={e => setPasswordRepeat(e.target.value)}
                />
              </div>
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
              Registrieren
            </button>
          </form>

          {/* AGBs */}
          <p className="font-inter w-full text-center text-[8px] font-light text-[#7A7A7A]">
            Mit der Registrierung akzeptierst du unsere AGBs.
          </p>
          {/* Privacy Note */}
          <p className="font-inter-tight flex w-full items-center text-[16px] font-light text-black">
            Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.
          </p>
        </div>
      </div>
    </div>
  );
} 