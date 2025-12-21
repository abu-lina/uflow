import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { waitlistUpdateSchema } from '@/lib/validation/waitlistSchemas';

/**
 * PATCH /api/waitlist/update
 * 
 * Update waitlist entry for early access tracking
 * 
 * Request body:
 * {
 *   email: string,
 *   waitlistToken: string,
 *   has_seen_early_access?: boolean,
 *   selected_city?: string,
 *   skipped_early_access?: boolean
 * }
 * 
 * Rate limiting: 20 requests per hour per IP
 */
export async function PATCH(request: Request) {
  try {
    // 1. Rate limiting - 20 requests per hour per IP
    const identifier = getClientIdentifier(request);
    const isAllowed = checkRateLimit(identifier, 20, 60 * 60 * 1000, 'waitlist-update');
    
    if (!isAllowed) {
      console.log('[Waitlist Update] Rate limit exceeded for:', identifier);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Too many requests. Please try again later.' } 
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    
    // Get token from body or cookie (cookie as fallback)
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const tokenFromCookie = cookieStore.get('waitlist_token')?.value;
    
    // If token not in body, try to get from cookie
    const bodyWithToken = {
      ...body,
      waitlistToken: body.waitlistToken || tokenFromCookie,
    };
    
    const validation = waitlistUpdateSchema.safeParse(bodyWithToken);
    
    if (!validation.success) {
      console.log('[Waitlist Update] Validation failed:', validation.error.errors);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Invalid request data' } 
        },
        { status: 400 }
      );
    }

    const { email, waitlistToken, ...updates } = validation.data;

    // 3. Update database
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = createSupabaseServerClient();

    // Build update object (only include defined fields)
    const updateData: Record<string, unknown> = {};
    if (updates.has_seen_early_access !== undefined) {
      updateData.has_seen_early_access = updates.has_seen_early_access;
    }
    if (updates.selected_city !== undefined) {
      updateData.selected_city = updates.selected_city;
    }
    if (updates.skipped_early_access !== undefined) {
      updateData.skipped_early_access = updates.skipped_early_access;
    }

    // Update only if email + token match (security check)
    const { error, count } = await supabase
      .from('waitlist')
      .update(updateData)
      .eq('email', email.toLowerCase().trim())
      .eq('waitlist_token', waitlistToken);

    // 4. Handle errors
    if (error) {
      console.error('[Waitlist Update] Database error:', error);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to update waitlist entry' } 
        },
        { status: 500 }
      );
    }

    // Check if any rows were updated (validates email + token match)
    if (count === 0) {
      console.log('[Waitlist Update] No matching entry found:', { email });
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Invalid email or token' } 
        },
        { status: 404 }
      );
    }

    console.log('[Waitlist Update] Successfully updated:', { email, updates });

    // 5. Return success response
    return NextResponse.json(
      { 
        data: { success: true },
        error: null 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Waitlist Update] Unexpected error:', error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Invalid request data' } 
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        data: null,
        error: { message: 'An error occurred. Please try again.' } 
      },
      { status: 500 }
    );
  }
}
