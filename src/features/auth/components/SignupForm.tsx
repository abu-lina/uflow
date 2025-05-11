'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SignupForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement signup logic
  };

  return (
    <form className="flex w-[475px] flex-col gap-10" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex flex-col gap-8">
        <h1 className="font-inter-tight text-3xl font-semibold text-text">
          Willkommen bei Ummah Flow
        </h1>
        <p className="font-inter text-base text-grey">
          Entdecke muslimische Angebote in deiner Nähe insha&apos;Allah.
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

        <div className="flex gap-10">
          <Input
            required
            id="password"
            label="Passwort"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Input
            required
            id="confirmPassword"
            label="Passwort wiederholen"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button className="h-14 w-full bg-mint text-lg text-white" type="submit">
        Registrieren
      </Button>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-grey">
          Deine Privatsphäre und Werte sind uns wichtig – wir verkaufen deine Daten niemals.
        </p>
        <p className="text-[8px] text-grey">AGBs</p>
      </div>
    </form>
  );
}
