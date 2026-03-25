import { NextResponse } from 'next/server';

import { isAdminOrModerator } from '@/lib/auth/roles';
import { logAdminAction, getClientIp, getUserAgent } from '@/lib/audit/adminAudit';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { validateAndSanitizeName } from '@/utils/sanitizeInput';
import { validateOfferOrNeedName } from '@/utils/contentValidation';

export async function POST(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - Admin or Moderator access required' }, { status: 403 });
    }

    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited = !rateLimiters.adminReview.perHour(identifier) ||
      !rateLimiters.adminReview.perMinute(identifier);
    if (isRateLimited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json().catch(() => null) as { name?: unknown } | null;
    const sanitizedName = validateAndSanitizeName(typeof body?.name === 'string' ? body.name : '', 100);

    if (!sanitizedName) {
      return NextResponse.json({ error: 'Need name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existingNeeds, error: existingNeedsError } = await supabase
      .from('needs')
      .select('name_de');

    if (existingNeedsError) {
      throw new Error(`Failed to validate need: ${existingNeedsError.message}`);
    }

    const validation = validateOfferOrNeedName(sanitizedName, existingNeeds ?? [], false);
    if (!validation.isValid) {
      const duplicateError = validation.errors.find((message) => message.includes('existiert bereits'));
      return NextResponse.json(
        { error: duplicateError ? 'An entry with this name already exists' : validation.errors[0] ?? 'Invalid need name' },
        { status: duplicateError ? 409 : 400 }
      );
    }

    const { data: createdNeed, error: createError } = await supabase
      .from('needs')
      .insert([{ name_de: sanitizedName, created_by: user.id }])
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'An entry with this name already exists' }, { status: 409 });
      }
      throw new Error(`Failed to create need: ${createError.message}`);
    }

    await logAdminAction(
      user.id,
      'need_create',
      'system',
      createdNeed.need_id,
      { name_de: createdNeed.name_de },
      {
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      }
    );

    return NextResponse.json({ data: createdNeed }, { status: 201 });
  } catch (error) {
    logger.error(
      'Error in admin needs API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      getRequestMetadata(request)
    );

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create need' },
      { status: 500 }
    );
  }
}