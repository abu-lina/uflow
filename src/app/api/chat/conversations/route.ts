import { NextResponse } from 'next/server';
import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  const ctx = createRequestContext('/api/chat/conversations');

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const supabase = createSupabaseServerClient();

    const { data, error } = await measureDependency(
      ctx,
      'supabase.conversations.list',
      async () => {
        const result = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('updated_at', { ascending: false });
        return result;
      },
    );

    if (error) {
      logRequestTiming(ctx);
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    logRequestTiming(ctx);

    return NextResponse.json(data || [], {
      headers: { 'X-Correlation-ID': ctx.correlationId },
    });
  } catch (error) {
    logRequestTiming(ctx);
    console.error('[API /chat/conversations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  }
}
