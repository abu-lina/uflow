import { NextResponse } from 'next/server';
import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendChatRequest } from '@/lib/openrouter';
import { executeToolCall, TOOL_DEFINITIONS } from '@/features/chat/services/tool-executor';
import {
  checkGuardrail,
  createRedirectCounter,
} from '@/features/chat/services/guardrails';
import { buildSystemPrompt } from '@/features/chat/prompts/system-prompt';
import { MAX_MESSAGE_LENGTH } from '@/features/chat/types';
import type { ChatMessage, ToolCall } from '@/features/chat/types';
import type { ProviderCardData } from '@/features/chat/types';

const CHAT_HISTORY_LIMIT = parseInt(
  process.env.CHAT_HISTORY_LIMIT || '20',
  10,
);
const MAX_TOOL_CALLS = 5;

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = createRequestContext('/api/chat');

  try {
    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const identifier = getClientIdentifier(request, user.id);
    if (!checkRateLimit(identifier, 20, 60_000, 'chat-minute')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending another message.' },
        { status: 429, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }
    if (!checkRateLimit(identifier, 200, 86_400_000, 'chat-day')) {
      return NextResponse.json(
        { error: 'Daily message limit reached. Please try again tomorrow.' },
        { status: 429, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    let body: { message?: string; conversation_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const rawMessage = body.message || '';
    const trimmedMessage = rawMessage.trim();

    if (!trimmedMessage) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
        { status: 400, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    const supabase = createSupabaseServerClient();

    let existingRedirectCount = 0;

    const conversationId = await measureDependency(
      ctx,
      'supabase.conversations.ensure',
      async () => {
        if (body.conversation_id) {
          const { data: existing } = await supabase
            .from('conversations')
            .select('id, user_id, redirect_count')
            .eq('id', body.conversation_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (existing) {
            existingRedirectCount = existing.redirect_count ?? 0;
            return existing.id;
          }
        }

        const convId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('conversations')
          .insert({
            id: convId,
            user_id: user.id,
            title: trimmedMessage.slice(0, 100),
            is_active: true,
          });

        if (insertError) {
          throw new Error(`Failed to create conversation: ${insertError.message}`);
        }

        return convId;
      },
    );

    const history = await measureDependency(
      ctx,
      'supabase.messages.load',
      async () => {
        const { data: recentMessages } = await supabase
          .from('messages')
          .select('role, content, tool_calls, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(CHAT_HISTORY_LIMIT);

        return (recentMessages || []) as ChatMessage[];
      },
    );

    const systemPrompt = buildSystemPrompt(true);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: trimmedMessage },
    ];

    const redirectCounter = createRedirectCounter(existingRedirectCount);

    let llmResponse = await measureDependency(
      ctx,
      'openrouter.chat_completion',
      () =>
        sendChatRequest(messages, {
          tools: TOOL_DEFINITIONS,
          tool_choice: 'auto',
        }),
    );

    let toolCalls = llmResponse.message.tool_calls || [];
    let toolCallCount = 0;
    let providerResults: ProviderCardData[] | undefined;

    const guardrailResult = checkGuardrail(llmResponse.message, redirectCounter);

    if (guardrailResult.status === 'block') {
      const blockContent =
        'I can only help you find and register services on UFlow. Please ask me about restaurants, stores, or community services.';

      await measureDependency(ctx, 'supabase.messages.save', async () => {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: trimmedMessage,
          token_count: llmResponse.usage?.total_tokens || 0,
        });

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: blockContent,
          token_count: llmResponse.usage?.total_tokens || 0,
        });

        await supabase
          .from('conversations')
          .update({
            updated_at: new Date().toISOString(),
            redirect_count: redirectCounter.count,
          })
          .eq('id', conversationId);
      });

      logRequestTiming(ctx);

      return NextResponse.json(
        {
          conversation_id: conversationId,
          message: { role: 'assistant', content: sanitizeOutput(blockContent) },
          guardrail: 'block',
        },
        { headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    while (toolCalls.length > 0 && toolCallCount < MAX_TOOL_CALLS) {
      toolCallCount++;

      const toolMessages: ChatMessage[] = [];

      for (const toolCall of toolCalls) {
        let toolResult: string;
        try {
          toolResult = await measureDependency(
            ctx,
            `tool.${toolCall.function.name}`,
            () => executeToolCall(toolCall, user.id),
          );
        } catch (error) {
          toolResult = JSON.stringify({
            error: error instanceof Error ? error.message : 'Tool execution failed',
          });
        }

        toolMessages.push({
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
        });

        if (toolCall.function.name === 'search_providers') {
          try {
            const parsed = JSON.parse(toolResult);
            if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
              providerResults = parsed.results;
            }
          } catch {
            // Ignore parse errors from tool execution
          }
        }

        messages.push({
          role: 'assistant',
          content: llmResponse.message.content || '',
          tool_calls: [toolCall],
        });
        messages.push(toolMessages[toolMessages.length - 1]);
      }

      llmResponse = await measureDependency(
        ctx,
        'openrouter.chat_completion',
        () =>
          sendChatRequest(
            [
              ...messages,
              ...toolMessages,
            ],
            {
              tools: TOOL_DEFINITIONS,
              tool_choice: 'auto',
            },
          ),
      );

      toolCalls = llmResponse.message.tool_calls || [];
    }

    const finalMessage = llmResponse.message;

    const totalTokens = llmResponse.usage?.total_tokens || 0;

    await measureDependency(ctx, 'supabase.messages.save', async () => {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: trimmedMessage,
        token_count: totalTokens,
      });

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: finalMessage.content || '',
        tool_calls: (finalMessage.tool_calls && finalMessage.tool_calls.length > 0)
          ? JSON.parse(JSON.stringify(finalMessage.tool_calls))
          : null,
        token_count: totalTokens,
      });

      await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
          redirect_count: redirectCounter.count,
        })
        .eq('id', conversationId);
    });

    logRequestTiming(ctx);

    const responsePayload: Record<string, unknown> = {
      conversation_id: conversationId,
      message: {
        role: 'assistant' as const,
        content: sanitizeOutput(finalMessage.content || ''),
        tool_calls: finalMessage.tool_calls,
      } as Record<string, unknown>,
    };

    if (providerResults) {
      responsePayload.results = providerResults;
    }

    if (guardrailResult.status === 'redirect') {
      responsePayload.guardrail = 'redirect';
    }

    return NextResponse.json(responsePayload, {
      headers: { 'X-Correlation-ID': ctx.correlationId },
    });
  } catch (error) {
    logRequestTiming(ctx);
    console.error('[API /chat] Error:', error);

    const message =
      error instanceof Error ? error.message : 'Internal server error';

    if (message.includes('OpenRouter API error') || message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Chat service is temporarily unavailable. Please try again later.' },
        { status: 503, headers: { 'X-Correlation-ID': ctx.correlationId } },
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500, headers: { 'X-Correlation-ID': ctx.correlationId } },
    );
  }
}

function sanitizeOutput(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}
