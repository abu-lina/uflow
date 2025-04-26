import { createServerClient } from '@/lib/database/supabase-server';
import type { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default async function AdminUsersPage() {
  const supabase = createServerClient();
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching profiles:', error);
    return <div>Error loading profiles</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <div className="grid gap-4">
        {profiles?.map((profile: Profile) => (
          <div key={profile.id} className="border p-4 rounded-lg">
            <h2 className="text-xl font-semibold">{profile.full_name || 'Unnamed User'}</h2>
            <p className="text-gray-600">{profile.email}</p>
            <p className="text-sm text-gray-500">Role: {profile.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 