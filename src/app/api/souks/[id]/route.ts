import { NextRequest, NextResponse } from 'next/server';
import { getSouk, updateSouk, deleteSouk, updateSoukStatus } from '@/services/souks/souks';
import { withApiErrorHandler } from '@/lib/api/utils';
import { createServerClient } from '@/lib/database/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiErrorHandler(async () => {
    const souk = await getSouk(params.id);
    if (!souk) {
      return NextResponse.json({ error: 'Souk not found' }, { status: 404 });
    }
    return NextResponse.json(souk);
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiErrorHandler(async () => {
    const body = await request.json();
    const souk = await updateSouk(params.id, body);
    return NextResponse.json(souk);
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiErrorHandler(async () => {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteSouk(params.id);
    return NextResponse.json({ success: true });
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withApiErrorHandler(async () => {
    const { status } = await request.json();
    await updateSoukStatus(params.id, status);
    return NextResponse.json({ success: true });
  });
} 