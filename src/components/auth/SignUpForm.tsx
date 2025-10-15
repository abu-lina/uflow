'use client';

import { useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { signUpWithLanguage } from '../../lib/auth';

export const SignUpForm = () => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const { data, error } = await signUpWithLanguage(email, password, language);
      
      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          language === 'de' 
            ? 'Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail.'
            : 'Signup successful! Please check your email.'
        );
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSignUp} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-content-title mb-2">
            {language === 'de' ? 'E-Mail-Adresse' : 'Email Address'}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none"
            placeholder={language === 'de' ? 'ihre@email.com' : 'your@email.com'}
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-content-title mb-2">
            {language === 'de' ? 'Passwort' : 'Password'}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-mint focus:border-mint outline-none"
            placeholder={language === 'de' ? 'Ihr Passwort' : 'Your password'}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-mint text-white py-3 px-4 rounded-lg font-medium hover:bg-mint/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading 
            ? (language === 'de' ? 'Registrierung läuft...' : 'Signing up...')
            : (language === 'de' ? 'Registrieren' : 'Sign Up')
          }
        </button>
        
        {message && (
          <div className={`p-4 rounded-lg text-sm ${
            message.includes('successful') || message.includes('erfolgreich')
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-danger/10 text-danger border border-danger/20'
          }`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};
