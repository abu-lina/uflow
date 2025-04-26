import { createServerClient } from '@/lib/database/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return NextResponse.json({ session });
} 