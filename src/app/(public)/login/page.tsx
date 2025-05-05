'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-neutral">Enter your credentials to sign in</p>
        </div>
        <form className="mt-8 space-y-6">
          <div className="space-y-4">
            <Input required placeholder="Email" type="email" />
            <Input required placeholder="Password" type="password" />
          </div>
          <Button className="w-full" type="submit">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
