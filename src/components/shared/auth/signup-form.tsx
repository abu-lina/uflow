'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { X } from 'lucide-react';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { signUp, supabase } = useAuth();

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
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // First, sign up the user
      const { error: signUpError, success, message } = await signUp(email, password);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (success) {
        // If signup was successful, update the profile with full name
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
              full_name: fullName,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

          if (profileError) {
            console.error('Error updating profile:', profileError);
            setError('Account created but failed to save profile information');
            return;
          }
        }

        setMessage(message || 'Check your email for a confirmation link!');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
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
        Registrieren
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
              {/* Add your decorative elements here */}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="w-1/2 h-full bg-white rounded-r-[48px] p-[80px_48px] flex flex-col justify-center items-start gap-[39px]">
          {/* Header */}
          <div className="w-full flex flex-col gap-8">
            <div className="flex flex-col items-center gap-2.5">
              <h2 className="text-[32px] font-semibold text-[#232323] font-['Inter_Tight']">
                Willkommen bei Ummah Flow
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
            
            {message && (
              <div className="bg-green-50 text-green-600 p-3 rounded-md">
                {message}
              </div>
            )}

            {/* Full Name Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[16px] text-[#CDCDCD] font-['Inter']">
                User Name*
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full border-b border-[#CDCDCD] focus:border-[#589D96] focus:outline-none py-2"
                placeholder="Your full name"
              />
            </div>

            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[16px] text-[#CDCDCD] font-['Inter']">
                Email*
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

            {/* Password Inputs */}
            <div className="flex gap-[39px]">
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[16px] text-[#CDCDCD] font-['Inter']">
                  Passwort*
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border-b border-[#CDCDCD] focus:border-[#589D96] focus:outline-none py-2"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <label className="text-[16px] text-[#CDCDCD] font-['Inter']">
                  Passwort wiederholen*
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border-b border-[#CDCDCD] focus:border-[#589D96] focus:outline-none py-2"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#589D96] text-white rounded-[16.8px] font-['Inter_Tight'] font-medium text-[20px] hover:bg-[#4a8a84] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            {/* Links and Privacy Text */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-[8px] text-[#7A7A7A] text-center">
                Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.
              </p>
              <Link 
                href="/auth/login" 
                className="text-[#589D96] hover:underline text-sm"
              >
                Already have an account? Log in
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