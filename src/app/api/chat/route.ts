import { NextResponse } from 'next/server';
import {
  createRequestContext,
  measureDependency,
  logRequestTiming,
} from '@/lib/telemetry/perf-telemetry';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendChatRequest, streamChatCompletion } from '@/lib/openrouter';
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
  process.env.CHAT_HISTORY_LIMIT || '10',
  10,
);
const MAX_TOOL_CALLS = 2;


function extractOptions(content: string): string[] | undefined {
  if (!content) return undefined;
  
  const options: string[] = [];
  
  // Pattern 1: Numbered list (1. Option, 2. Option)
  const numberedMatch = content.match(/^\d+\.\s+(.+)$/gm);
  if (numberedMatch && numberedMatch.length >= 2) {
    return numberedMatch.map(m => m.replace(/^\d+\.\s+/, '').trim());
  }
  
  // Pattern 2: Ja/Nein questions
  if (/möchtest du|soll ich|willst du|brauchst du|kann ich/i.test(content)) {
    if (/(ja|nein|yes|no)/i.test(content)) {
      options.push('Ja', 'Nein');
    }
  }
  
  // Pattern 3: Bullet points (• or -)
  const bulletMatch = content.match(/^[•\-]\s+(.+)$/gm);
  if (bulletMatch && bulletMatch.length >= 2) {
    return bulletMatch.map(m => m.replace(/^[•\-]\s+/, '').trim());
  }
  
  return options.length > 0 ? options : undefined;
}


export async function POST(request: Request): Promise<NextResponse | Response> {
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

    const supabase = getSupabaseAdmin();

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

    const systemPrompt = await buildSystemPrompt(true);

    // Detect registration mode: check if first message or any recent message indicates registration
    const firstUserMsg = history.find(m => m.role === 'user')?.content || '';
    const isRegistrationMode = /(?:registrieren|anmelden|eintragen|hinzufügen|neues restaurant|neuen laden)/i.test(firstUserMsg);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(isRegistrationMode ? [{
        role: 'system' as const,
        content: 'CRITICAL: You are in REGISTRATION MODE. The user is answering your registration questions. Do NOT call search_providers. Continue collecting registration data.',
      }] : []),
      ...history,
      { role: 'user', content: trimmedMessage },
    ];

    const redirectCounter = createRedirectCounter(existingRedirectCount);

    // In registration mode, remove search tools to prevent accidental searches
    const availableTools = isRegistrationMode
      ? TOOL_DEFINITIONS.filter(t => t.function.name !== 'search_providers')
      : TOOL_DEFINITIONS;

    let llmResponse = await measureDependency(
      ctx,
      'openrouter.chat_completion',
      () =>
        sendChatRequest(messages, {
          tools: availableTools,
          tool_choice: 'auto',
        }),
    );

    let toolCalls = llmResponse.message.tool_calls || [];
    let toolCallCount = 0;
    let providerResults: ProviderCardData[] | undefined;

    // Only check guardrails on the first message — follow-ups are part of an established flow
    const guardrailResult = history.length === 0
      ? checkGuardrail(llmResponse.message, redirectCounter)
      : { status: 'ok' } as ReturnType<typeof checkGuardrail>;

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

    // Execute tools once, then force text-only follow-up (no more tool calls)

    if (toolCalls.length > 0 && toolCallCount < MAX_TOOL_CALLS) {
      toolCallCount++;

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

        if (toolCall.function.name === 'search_providers') {
          try {
            const parsed = JSON.parse(toolResult);
            if (parsed.results && Array.isArray(parsed.results) && parsed.results.length > 0) {
              providerResults = parsed.results;
            }
          } catch {
            // Ignore parse errors
          }
        }

        messages.push({
          role: 'assistant',
          content: llmResponse.message.content || '',
          tool_calls: [toolCall],
        });
        messages.push({
          role: 'tool',
          content: toolResult,
          tool_call_id: toolCall.id,
        });
      }

      // Stream the follow-up response via SSE
      const streamBody = await streamChatCompletion(
        messages,
        { max_tokens: 768, model: 'mistral-small-latest' },
      );

      // Return SSE response directly — no more processing
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const reader = streamBody.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            // First, send conversation_id
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversation_id: conversationId })}

`));

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}

`));
                  }
                } catch {
                  // Skip unparseable chunks
                }
              }
            }
          } catch (e) {
            controller.error(e);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Correlation-ID': ctx.correlationId,
        },
      });
    }
    // Stream all responses for typewriter effect
    if (toolCallCount === 0 && (guardrailResult.status as string) !== 'block') {
      const streamBody = await streamChatCompletion(
        messages,
        { max_tokens: 768, model: 'mistral-small-latest' },
      );
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const reader = streamBody.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversation_id: conversationId })}\n\n`));
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const sseLines = buf.split('\n');
              buf = sseLines.pop() || '';
              for (const sl of sseLines) {
                if (!sl.startsWith('data: ')) continue;
                const d = sl.slice(6);
                if (d === '[DONE]') { controller.enqueue(encoder.encode('data: [DONE]\n\n')); controller.close(); return; }
                try { const p = JSON.parse(d); const c = p.choices?.[0]?.delta?.content; if (c) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: c })}\n\n`)); } catch {}
              }
            }
          } catch (e) { controller.error(e); }
        },
      });
      // Save messages so next request can detect registration mode from history
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: trimmedMessage,
        token_count: 0,
      });
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: '(streaming)',
        token_count: 0,
      });
      await supabase.from('conversations').update({
        updated_at: new Date().toISOString(),
        redirect_count: redirectCounter.count,
      }).eq('id', conversationId);

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Correlation-ID': ctx.correlationId },
      });
    }

    // Strip unexecuted tool calls from final response — client can't process them
    // Strip tool_calls from final response — client can't process them
    (llmResponse.message as Record<string, unknown>).tool_calls = undefined;
    // Ensure we never return empty content to the client
    if (!llmResponse.message.content) {
      llmResponse.message.content = 'Entschuldigung, ich konnte keine Antwort generieren. Bitte versuche es erneut.';
    }




    const finalMessage = llmResponse.message;
    const options = extractOptions(finalMessage.content || '');
    // Strip redundant numbered/bullet lists from content when options are available as buttons
    if (options && options.length > 0 && finalMessage.content) {
      finalMessage.content = finalMessage.content
        .replace(/^\d+\.\s+.+$/gm, '')
        .replace(/^[•\-]\s+.+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

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
    if (options) {
      responsePayload.options = options;
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

    if (message.includes('API error') || message.includes('fetch') || message.includes('No AI provider')) {
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
