import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p className="text-text-neutral mb-6">Welcome back, {user?.email}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/providers">
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Provider Review</h2>
            <p className="text-gray-600 text-sm">Review and approve provider applications</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
