import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Shield, Zap, Database } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-neutral-muted to-white px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-content-heading sm:text-6xl">
            Next.js + Supabase
            <span className="block text-primary">Starter Template</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-content-muted">
            A production-ready starter template with authentication, database, and modern UI
            components. Built with Next.js 15, Supabase, TypeScript, and Tailwind CSS.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" variant="primary">
                Get Started
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-content-heading">
            Everything you need to start building
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="text-primary" size={24} />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-content-heading">
                Secure Authentication
              </h3>
              <p className="text-content-muted">
                Built-in authentication with Supabase. Email/password login, signup, password reset,
                and protected routes out of the box.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Database className="text-primary" size={24} />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-content-heading">Database Ready</h3>
              <p className="text-content-muted">
                PostgreSQL database with Supabase. Includes migrations, Row Level Security, and
                real-time subscriptions ready to use.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="text-primary" size={24} />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-content-heading">Modern Stack</h3>
              <p className="text-content-muted">
                Next.js 15 with App Router, TypeScript, Tailwind CSS, and TanStack Query for the
                best developer experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="bg-neutral-muted px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-content-heading">
            Built with modern technologies
          </h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              'Next.js 15',
              'TypeScript',
              'Supabase',
              'Tailwind CSS',
              'TanStack Query',
              'Server Components',
              'ESLint + Prettier',
              'Lucide Icons',
            ].map((tech) => (
              <div
                key={tech}
                className="rounded-lg border border-border bg-white p-4 text-center font-medium text-content"
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-content-heading">Ready to start building?</h2>
          <p className="mt-4 text-lg text-content-muted">
            Create your account and start building your next project today.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button size="lg" variant="primary">
                Get Started for Free
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}





