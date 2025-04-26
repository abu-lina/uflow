import { NextRequest, NextResponse } from 'next/server';
import { incrementSoukViews, getSoukViews } from '@/services/souks/views';
import { withApiErrorHandler } from '@/lib/api/utils';
import { createServerClient } from '@/lib/database/supabase-server';

// NOTE: This endpoint relies on Supabase RLS for access control.
// Only authenticated users can insert views, and users can only see their own views.

export async function POST(request: NextRequest) {
  return withApiErrorHandler(async () => {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { soukId } = await request.json();

    await incrementSoukViews(soukId, session?.user?.id);
    return NextResponse.json({ success: true });
  });
}

export async function GET(request: NextRequest) {
  return withApiErrorHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const soukId = searchParams.get('soukId');

    if (!soukId) {
      return NextResponse.json({ error: 'Souk ID is required' }, { status: 400 });
    }

    const views = await getSoukViews(soukId);
    return NextResponse.json({ views });
  });
} 