'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SigninForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement signin logic
  };

  return (
    <form className="flex w-[475px] flex-col gap-10" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex flex-col gap-8">
        <h1 className="font-inter-tight text-3xl font-semibold text-text">Willkommen zurück</h1>
        <p className="font-inter text-base text-grey">
          Melde dich an, um deine Angebote zu verwalten.
        </p>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-6">
        <Input
          required
          id="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <Input
          required
          id="password"
          label="Passwort"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        />
      </div>

      {/* Submit Button */}
      <Button className="h-14 w-full bg-mint text-lg text-white" type="submit">
        Anmelden
      </Button>

      {/* Footer */}
      <div className="flex flex-col items-center gap-4 text-center">
        <Link className="text-sm text-grey hover:text-primary" href="/forgot-password">
          Passwort vergessen?
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-grey">Noch kein Konto?</span>
          <Link className="text-sm text-primary hover:underline" href="/signup">
            Jetzt registrieren
          </Link>
        </div>
      </div>
    </form>
  );
}
