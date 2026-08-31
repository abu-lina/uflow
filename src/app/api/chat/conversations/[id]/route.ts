import { NextResponse } from 'next/server';
import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = createRequestContext('/api/chat/conversations/[id]');

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const { id } = await params;
    const supabase = createSupabaseServerClient();

    const { data: conversation } = await measureDependency(
      ctx,
      'supabase.conversations.get',
      async () => {
        const result = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        return result;
      },
    );

    if (!conversation) {
      logRequestTiming(ctx);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const { data: messages } = await measureDependency(
      ctx,
      'supabase.messages.get',
      async () => {
        const result = await supabase
          .from('messages')
          .select('role, content, tool_calls, created_at')
          .eq('conversation_id', id)
          .order('created_at', { ascending: true });
        return result;
      },
    );

    logRequestTiming(ctx);

    return NextResponse.json(
      { ...conversation, messages: messages || [] },
      { headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  } catch (error) {
    logRequestTiming(ctx);
    console.error('[API /chat/conversations/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const ctx = createRequestContext('/api/chat/conversations/[id]');

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const { id } = await params;
    const supabase = createSupabaseServerClient();

    const { error } = await measureDependency(
      ctx,
      'supabase.conversations.delete',
      async () => {
        const result = await supabase
          .from('conversations')
          .update({ is_active: false })
          .eq('id', id)
          .eq('user_id', user.id);
        return result;
      },
    );

    if (error) {
      logRequestTiming(ctx);
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    logRequestTiming(ctx);

    return NextResponse.json(
      { success: true },
      { headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  } catch (error) {
    logRequestTiming(ctx);
    console.error('[API /chat/conversations/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  }
}
