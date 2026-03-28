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

    const body = await request.json().catch(() => null) as { name?: unknown; categoryId?: unknown } | null;
    const sanitizedName = validateAndSanitizeName(typeof body?.name === 'string' ? body.name : '', 100);
    const categoryId = typeof body?.categoryId === 'string' ? body.categoryId : null;

    if (!sanitizedName) {
      return NextResponse.json({ error: 'Offer name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: existingOffers, error: existingOffersError } = await supabase
      .from('offers')
      .select('name_de');

    if (existingOffersError) {
      throw new Error(`Failed to validate offer: ${existingOffersError.message}`);
    }

    const validation = validateOfferOrNeedName(sanitizedName, existingOffers ?? [], false);
    if (!validation.isValid) {
      const duplicateError = validation.errors.find((message) => message.includes('existiert bereits'));
      return NextResponse.json(
        { error: duplicateError ? 'An entry with this name already exists' : validation.errors[0] ?? 'Invalid offer name' },
        { status: duplicateError ? 409 : 400 }
      );
    }

    // Migration 006 made category_id NOT NULL; use provider's category or fall back to 'Sonstiges' (Other)
    const DEFAULT_CATEGORY_ID = '5e5d910d-d790-4184-a061-9cd74d0950e8';
    const effectiveCategoryId = categoryId || DEFAULT_CATEGORY_ID;

    const { data: createdOffer, error: createError } = await supabase
      .from('offers')
      .insert([{ name_de: sanitizedName, created_by: user.id, category_id: effectiveCategoryId }])
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'An entry with this name already exists' }, { status: 409 });
      }
      throw new Error(`Failed to create offer: ${createError.message}`);
    }

    await logAdminAction(
      user.id,
      'offer_create',
      'system',
      createdOffer.offer_id,
      { name_de: createdOffer.name_de },
      {
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      }
    );

    return NextResponse.json({ data: createdOffer }, { status: 201 });
  } catch (error) {
    logger.error(
      'Error in admin offers API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      getRequestMetadata(request)
    );

    // Plan 060 H-2: Sanitize error message in production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to create offer'
      : error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}