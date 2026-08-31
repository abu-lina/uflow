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
import type { ChatMessage } from '@/features/chat/types';
import type { ProviderCardData } from '@/features/chat/types';

const CHAT_HISTORY_LIMIT = parseInt(
  process.env.CHAT_HISTORY_LIMIT || '30',
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
    if (/\b(ja|nein|yes|no)\b/i.test(content)) {
      options.push('Ja', 'Nein');
    }
  }
  
  // Pattern 3: Bullet points (• or -)
  const bulletMatch = content.match(/^[•-]\s+(.+)$/gm);
  if (bulletMatch && bulletMatch.length >= 2) {
    return bulletMatch.map(m => m.replace(/^[•-]\s+/, '').trim());
  }
  
  // Pattern 4: Newline-separated simple options (plain text list without numbers)
  const lineMatch = content.match(/^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß&()/,.-]*(?: [A-Za-zÄÖÜäöüß&()/,.-]+)*$/gm);
  if (lineMatch && lineMatch.length >= 3) {
    const filtered = lineMatch
      .map(l => l.trim())
      .filter(l => l.length > 2 && l.length < 100 && !l.endsWith('?'));
    if (filtered.length >= 3) {
      return filtered;
    }
  }
    
  // Pattern 5: Comma-separated list after "Vorschläge" or similar (e.g. "zur Auswahl: A, B, C")
  const colonList = content.match(/[Vv]orschl[äa]ge[^:]*:\s*(.{5,400}?)(?:\.\s|[?!]|\n\n|$)/);
  if (colonList) {
    const items = colonList[1]
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 2 && i.length < 60 && !i.endsWith('?') && !i.endsWith(':'));
    if (items.length >= 3) {
      // Remove numbering if present
      return items.map(i => i.replace(/^\d+\.\s*/, ''));
    }
  }
  
  return options.length > 0 ? options : undefined;
}


// Async helper: reads SSE stream content, saves to DB after stream ends
async function saveStreamToDb(
  stream: ReadableStream,
  conversationId: string,
  userMessage: string,
  redirectCount: number,
): Promise<void> {
  try {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) assistantContent += parsed.content;
        } catch { /* ignore */ }
      }
    }

    // Save to DB
    const supabase = getSupabaseAdmin();
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      token_count: 0,
    });
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantContent || 'Entschuldigung, ich konnte keine Antwort generieren.',
      token_count: 0,
    });
    await supabase.from('conversations').update({
      updated_at: new Date().toISOString(),
      redirect_count: redirectCount,
    }).eq('id', conversationId);
  } catch (e) {
    console.error('[saveStreamToDb error]', e);
  }
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

    // Detect if the last assistant message was a confirmation prompt and user is confirming
    const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant')?.content || '';
    const isConfirmationResponse = isRegistrationMode
      && /(?:korrekt|registrieren|bestätig|soll ich)/i.test(lastAssistantMsg)
      && /^(?:ja|yes|korrekt|stimmt|passt|genau|ok|okay|sicher|mach|bitte|do it|go ahead)\b/i.test(trimmedMessage.trim());

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(isRegistrationMode ? [{
        role: 'system' as const,
        content: 'CRITICAL: You are in REGISTRATION MODE. The user is answering your registration questions. Do NOT call search_providers. Continue collecting registration data.',
      }] : []),
      ...(isConfirmationResponse ? [{
        role: 'system' as const,
        content: 'URGENT: The user has CONFIRMED the registration. You MUST call register_provider NOW with all collected data. Do NOT ask any more questions. Do NOT show the summary again. CALL THE TOOL IMMEDIATELY. Use listing_type "food" for restaurants. Pass the category name directly as category_id — it will be resolved automatically.',
      }] : []),
      ...history,
      { role: 'user', content: trimmedMessage },
    ];

    const redirectCounter = createRedirectCounter(existingRedirectCount);

    // In registration mode, remove search tools to prevent accidental searches
    const availableTools = isRegistrationMode
      ? TOOL_DEFINITIONS.filter(t => t.function.name !== 'search_providers')
      : TOOL_DEFINITIONS;

    // Force register_provider tool call when user confirms registration
    const toolChoice = isConfirmationResponse
      ? { type: 'function' as const, function: { name: 'register_provider' } }
      : 'auto' as const;

    let llmResponse = await measureDependency(
      ctx,
      'openrouter.chat_completion',
      () =>
        sendChatRequest(messages, {
          tools: availableTools,
          tool_choice: toolChoice,
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
        'I can only help you find and register restaurants on UFlow. Please ask me about restaurants or Muslim-friendly dining near you.';

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

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const reader = streamBody.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let collectedContent = '';

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
                  try {
                    const opts = extractOptions(collectedContent || '');
                    if (opts && opts.length > 0) {
                      controller.enqueue(encoder.encode('data: ' + JSON.stringify({ options: opts }) + '\n\n'));
                    }
                  } catch { /* ignore */ }
                  if (providerResults && providerResults.length > 0) {
                    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ results: providerResults }) + '\n\n'));
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));

                  // Save messages to DB after tool call streaming completes
                  try {
                    const adminDb = getSupabaseAdmin();
                    await adminDb.from('messages').insert({
                      conversation_id: conversationId,
                      role: 'user',
                      content: trimmedMessage,
                      token_count: 0,
                    });
                    await adminDb.from('messages').insert({
                      conversation_id: conversationId,
                      role: 'assistant',
                      content: collectedContent || 'Entschuldigung, ich konnte keine Antwort generieren.',
                      token_count: 0,
                    });
                    await adminDb.from('conversations').update({
                      updated_at: new Date().toISOString(),
                      redirect_count: redirectCounter.count,
                    }).eq('id', conversationId);
                  } catch (e) {
                    console.error('[Tool stream save error]', e);
                  }

                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    collectedContent += content;
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
          let collectedContent = '';
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
                if (d === '[DONE]') {
                  try {
                    const opts = extractOptions(collectedContent || '');
                    if (opts && opts.length > 0) {
                      controller.enqueue(encoder.encode('data: ' + JSON.stringify({ options: opts }) + '\n\n'));
                    }
                  } catch { /* ignore */ }
                  if (providerResults && providerResults.length > 0) {
                    controller.enqueue(encoder.encode('data: ' + JSON.stringify({ results: providerResults }) + '\n\n'));
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }
                try { const p = JSON.parse(d); const c = p.choices?.[0]?.delta?.content; if (c) { collectedContent += c; controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: c })}\n\n`)); } } catch { /* ignore */ }
              }
            }
          } catch (e) { controller.error(e); }
        },
      });
      const [clientStream, saveStream] = stream.tee();
      saveStreamToDb(saveStream, conversationId, trimmedMessage, redirectCounter.count).catch(e =>
        console.error('[Stream save error]', e)
      );

      return new Response(clientStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Correlation-ID': ctx.correlationId },
      });
    }

    // Strip unexecuted tool calls from final response — client can't process them
    // Strip tool_calls from final response — client can't process them
    (llmResponse.message as Record<string, unknown>).tool_calls = undefined;
    // Ensure we never return empty content to the client
    if (!llmResponse.message.content) {
      llmResponse.message.content = 'Entschuldigung, es gab ein Problem. Bitte versuche es erneut oder starte eine neue Registrierung mit "Ich möchte ein Restaurant registrieren".';
    }




    const finalMessage = llmResponse.message;
    const options = extractOptions(finalMessage.content || '');
    // Strip redundant lists from content when options are available as buttons
    if (options && options.length > 0 && finalMessage.content) {
      let cleaned = finalMessage.content
        .replace(/^\d+\.\s+.+$/gm, '')
        .replace(/^[•-]\s+.+$/gm, '');
      // Strip lines that match extracted options exactly
      for (const opt of options) {
        const escaped = opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleaned = cleaned.replace(new RegExp('^.*' + escaped + '.*$', 'gm'), '');
      }
      // Also strip comma-separated option lines (Pattern 5 style)
      if (options.length >= 3) {
        const joined = options.join(', ');
        cleaned = cleaned.replace(joined, '');
      }
      finalMessage.content = cleaned.replace(/\n{3,}/g, '\n\n').trim();
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
