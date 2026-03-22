import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>
      <p className="text-text-neutral mb-6">Welcome back, {user?.email}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/dashboard/providers">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <h2 className="mb-2 text-xl font-semibold">Provider Review</h2>
            <p className="text-sm text-gray-600">Review and approve provider applications</p>
          </div>
        </Link>
        <Link href="/dashboard/import">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <h2 className="mb-2 text-xl font-semibold">JoinHalal Import</h2>
            <p className="text-sm text-gray-600">
              Preview a dry-run import from JoinHalal listings
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
