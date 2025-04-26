import { NextRequest, NextResponse } from 'next/server';
import { fetchSoukOffers, updateOfferStatus } from '@/services/souks/offers';
import { withApiErrorHandler } from '@/lib/api/utils';
import { createServerClient } from '@/lib/database/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiErrorHandler(async () => {
    const offers = await fetchSoukOffers(params.id);
    return NextResponse.json(offers);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiErrorHandler(async () => {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();
    const offer = await updateOfferStatus(params.id, status);
    return NextResponse.json(offer);
  });
} 