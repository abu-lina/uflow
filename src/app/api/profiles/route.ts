import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

// NOTE: This endpoint relies on Supabase RLS for access control.
// Only the authenticated user can update their own profile, and only admins can delete.

// GET handler for fetching profiles
export async function GET() {
  try {
    const supabase = createServerSideClient();

    const { data: profiles, error } = await supabase.from('profiles').select('*');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profiles);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH handler for updating profiles
export async function PATCH(request: Request) {
  try {
    const { id, data } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { data: updatedData, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedData as Profile });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE handler for removing profiles
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const supabase = createServerSideClient();
    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
