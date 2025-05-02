import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase/server';

// NOTE: This endpoint relies on Supabase RLS for access control.
// Only the authenticated user can access their own bookmarks.

export async function GET() {
  try {
    const supabase = createServerSideClient();

    const { data: bookmarks, error } = await supabase.from('bookmarks').select('*');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(bookmarks);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = createServerSideClient();

    const { data: bookmark, error } = await supabase
      .from('bookmarks')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(bookmark);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
