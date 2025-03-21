import SupabaseConnectionTest from '@/components/SupabaseConnectionTest';

export default function SupabaseTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>
      <SupabaseConnectionTest />
    </main>
  );
} 