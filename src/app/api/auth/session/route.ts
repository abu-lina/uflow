import { NextResponse } from 'next/server';
import { createServerSideClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerSideClient();

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Auth error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
