'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { X } from 'lucide-react';

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
        onClick={() => setIsOpen(true)}
        className="px-6 py-2 bg-[#589D96] text-white rounded-lg hover:bg-[#4a8a84] transition-colors"
      >
        Anmelden
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1142px] h-[694px] flex">
        {/* Left Section */}
        <div className="w-1/2 h-full bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB] rounded-l-[48px] p-[52px] flex flex-col justify-center items-center gap-[66px]">
          {/* Logo and Icons */}
          <div className="relative w-[384px] h-[384px]">
            {/* Logo Circle */}
            <div className="absolute w-[369.23px] h-[369.23px] left-[7.39px] top-[7.39px] bg-[#589D96] rounded-full" />
            
            {/* Decorative Elements */}
            <div className="absolute w-[192.74px] h-[167.68px] left-1/2 -translate-x-1/2 top-[101.17px]">
              {/* Vector 22 */}
              <div className="absolute w-[70.85px] h-[50.38px] left-[86.41px] top-[114.07px] bg-[#DBF7F4] shadow-[inset_0px_2.95385px_2.21539px_rgba(0,0,0,0.4)]" />
              
              {/* Rectangle 31 */}
              <div className="absolute w-[134.63px] h-[109.54px] left-[86.41px] top-0 bg-white shadow-[inset_0px_2.95385px_2.95385px_rgba(0,0,0,0.25)] rounded-[99.7293px]" />
              
              {/* Rectangle 34 */}
              <div className="absolute w-[164.14px] h-[105.96px] left-0 top-[164.1px] bg-gradient-to-r from-[#F1F2F2] to-[#DBF7F4] shadow-[inset_0px_2.95385px_2.95385px_rgba(0,0,0,0.25)] rounded-[99.7293px] -rotate-90" />
              
              {/* Rectangle 32 */}
              <div className="absolute w-[106.38px] h-[104.67px] left-[86.41px] top-[62.98px] bg-[#F1FFFF] shadow-[inset_0px_2.95385px_2.95385px_rgba(0,0,0,0.25)] rounded-[99.7293px]" />
              
              {/* Vector 25 */}
              <div className="absolute w-[185.9px] h-[131.17px] left-[368.36px] top-[205.28px] bg-gradient-to-br from-[#DBF7F4] to-[#589D96] transform -rotate-12" />
              
              {/* Vector 26 */}
              <div className="absolute w-[144.6px] h-[121.48px] left-[215.27px] top-[250.35px] bg-white/25" />
              
              {/* Vector 27 */}
              <div className="absolute w-[144.6px] h-[121.48px] left-[248.1px] top-[217.09px] bg-white/17 transform rotate-90" />
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="w-1/2 h-full bg-white rounded-r-[48px] p-[80px_48px] flex flex-col justify-center items-start gap-[39px]">
          {/* Header */}
          <div className="w-full flex flex-col gap-8">
            <div className="flex flex-col items-center gap-2.5">
              <h2 className="text-[32px] font-semibold text-[#232323] font-['Inter_Tight'] leading-[39px]">
                Willkommen zurück bei<br />Ummah Flow
              </h2>
              <p className="text-[16px] text-[#7A7A7A] font-['Inter']">
                Entdecke muslimische Angebote in deiner Nähe insha'Allah.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[16px] text-[#CDCDCD] font-['Inter']">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-b border-[#CDCDCD] focus:border-[#589D96] focus:outline-none py-2"
                placeholder="your@email.com"
              />
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[16px] text-[#CDCDCD] font-['Inter']">
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border-b border-[#CDCDCD] focus:border-[#589D96] focus:outline-none py-2"
                placeholder="Your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#589D96] text-white rounded-[16.8px] font-['Inter_Tight'] font-medium text-[20px] hover:bg-[#4a8a84] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Anmelden'}
            </button>

            {/* Links */}
            <div className="flex flex-col items-end gap-2">
              <Link 
                href="/auth/reset-password" 
                className="text-[16px] text-black font-['Inter_Tight'] font-light underline"
              >
                Passwort vergessen?
              </Link>
            </div>
          </form>

          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-8 right-8 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-[#232323]" />
          </button>
        </div>
      </div>
    </>
  );
} 