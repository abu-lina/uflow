'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { X } from 'lucide-react';

import { useAuth } from '@/features/auth/context/AuthContext';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectedFrom') || '/profile';

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError, success } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (success) {
        console.log('Login successful, redirecting to:', redirectTo);
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="rounded-lg bg-[#589D96] px-6 py-2 text-white transition-colors hover:bg-[#4a8a84]"
        onClick={() => setIsOpen(true)}
      >
        Anmelden
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex h-[694px] w-[1142px] -translate-x-1/2 -translate-y-1/2">
        {/* Left Section */}
        <div className="flex h-full w-1/2 flex-col items-center justify-center gap-[66px] rounded-l-[48px] bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] p-[52px]">
          {/* Logo and Icons */}
          <div className="relative h-[384px] w-[384px]">
            {/* Logo Circle */}
            <div className="absolute left-[7.39px] top-[7.39px] h-[369.23px] w-[369.23px] rounded-full bg-[#589D96]" />

            {/* Decorative Elements */}
            <div className="absolute left-1/2 top-[101.17px] h-[167.68px] w-[192.74px] -translate-x-1/2">
              {/* Vector 22 */}
              <div className="absolute left-[86.41px] top-[114.07px] h-[50.38px] w-[70.85px] bg-[#DBF7F4] shadow-[inset_0px_2.95385px_2.21539px_rgba(0,0,0,0.4)]" />

              {/* Rectangle 31 */}
              <div className="absolute left-[86.41px] top-0 h-[109.54px] w-[134.63px] rounded-[99.7293px] bg-white shadow-[inset_0px_2.95385px_2.95385px_rgba(0,0,0,0.25)]" />

              {/* Rectangle 34 */}
              <div className="absolute left-0 top-[164.1px] h-[105.96px] w-[164.14px] -rotate-90 rounded-[99.7293px] bg-gradient-to-r from-[#F1F2F2] to-[#DBF7F4] shadow-[inset_0px_2.95385px_2.95385px_rgba(0,0,0,0.25)]" />

              {/* Rectangle 32 */}
              <div className="absolute left-[86.41px] top-[62.98px] h-[104.67px] w-[106.38px] rounded-[99.7293px] bg-[#F1FFFF] shadow-[inset_0px_2.95385px_2.95385px_rgba(0,0,0,0.25)]" />

              {/* Vector 25 */}
              <div className="absolute left-[368.36px] top-[205.28px] h-[131.17px] w-[185.9px] -rotate-12 transform bg-gradient-to-br from-[#DBF7F4] to-[#589D96]" />

              {/* Vector 26 */}
              <div className="absolute left-[215.27px] top-[250.35px] h-[121.48px] w-[144.6px] bg-white/25" />

              {/* Vector 27 */}
              <div className="bg-white/17 absolute left-[248.1px] top-[217.09px] h-[121.48px] w-[144.6px] rotate-90 transform" />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex h-full w-1/2 flex-col items-start justify-center gap-[39px] rounded-r-[48px] bg-white p-[80px_48px]">
          {/* Header */}
          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col items-center gap-2.5">
              <h2 className="font-['Inter_Tight'] text-[32px] font-semibold leading-[39px] text-[#232323]">
                Willkommen zurück bei
                <br />
                Ummah Flow
              </h2>
              <p className="font-['Inter'] text-[16px] text-[#7A7A7A]">
                Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
              </p>
              <p className="text-center text-[8px] text-[#7A7A7A]">
                Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.
              </p>
            </div>
          </div>

          {/* Form */}
          <form className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
            {error && <div className="rounded-md bg-red-50 p-3 text-red-600">{error}</div>}

            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="font-['Inter'] text-[16px] text-[#CDCDCD]">Email</label>
              <input
                required
                className="w-full border-b border-[#CDCDCD] py-2 focus:border-[#589D96] focus:outline-none"
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label className="font-['Inter'] text-[16px] text-[#CDCDCD]">Passwort</label>
              <input
                required
                className="w-full border-b border-[#CDCDCD] py-2 focus:border-[#589D96] focus:outline-none"
                placeholder="Your password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              className="h-14 w-full rounded-[16.8px] bg-[#589D96] font-['Inter_Tight'] text-[20px] font-medium text-white transition-colors hover:bg-[#4a8a84] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Logging in...' : 'Anmelden'}
            </button>

            {/* Links */}
            <div className="flex flex-col items-end gap-2">
              <Link
                className="font-['Inter_Tight'] text-[16px] font-light text-black underline"
                href="/auth/reset-password"
              >
                Passwort vergessen?
              </Link>
            </div>
          </form>

          {/* Close Button */}
          <button
            className="absolute right-8 top-8 rounded-full p-2 transition-colors hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6 text-[#232323]" />
          </button>
        </div>
      </div>
    </>
  );
}
