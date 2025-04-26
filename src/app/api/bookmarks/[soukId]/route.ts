import { NextRequest, NextResponse } from 'next/server';
import { toggleBookmark } from '@/services/souks/bookmarks';
import { withApiErrorHandler } from '@/lib/api/utils';
import { createServerClient } from '@/lib/database/supabase-server';

// NOTE: This endpoint relies on Supabase RLS for access control.
// Only the authenticated user can access their own bookmarks.

export async function POST(
  _request: NextRequest,
  { params }: { params: { soukId: string } }
) {
  return withApiErrorHandler(async () => {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isBookmarked = await toggleBookmark(session.user.id, params.soukId);
    return NextResponse.json({ isBookmarked });
  });
} 