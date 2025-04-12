import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

type Params = { id: string };

// Use the simpler pattern that works for Next.js 15
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const id = params.id;
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Fetch the service
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}
