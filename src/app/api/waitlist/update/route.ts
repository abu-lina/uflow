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
    
    // Merge token from cookie if not in body
    const finalToken = body.waitlistToken || tokenFromCookie;
    
    // Validate that we have a token from either source
    if (!finalToken || finalToken.trim().length === 0) {
      console.log('[Waitlist Update] Token missing from both body and cookie');
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Token is required' } 
        },
        { status: 400 }
      );
    }
    
    // If token not in body, try to get from cookie
    const bodyWithToken = {
      ...body,
      waitlistToken: finalToken,
    };
    
    const validation = waitlistUpdateSchema.safeParse(bodyWithToken);
    
    if (!validation.success) {
      console.log('[Waitlist Update] Validation failed:', validation.error.errors);
      const firstError = validation.error.errors[0];
      const errorMessage = firstError?.message || 'Invalid request data';
      return NextResponse.json(
        { 
          data: null,
          error: { message: errorMessage, details: validation.error.errors } 
        },
        { status: 400 }
      );
    }

    const { email, waitlistToken, ...updates } = validation.data;

    // 3. Update database using RPC function
    // The RPC function handles token validation and RLS bypass securely
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = createSupabaseServerClient();

    // Log what we're trying to update
    if (updates.selected_city !== undefined) {
      console.log('[Waitlist Update] Updating selected_city:', { 
        email: email.toLowerCase().trim(), 
        selected_city: updates.selected_city,
        tokenLength: waitlistToken?.length 
      });
    }

    // Call RPC function to update waitlist entry
    // Function validates token and bypasses RLS using SECURITY DEFINER
    const { data: result, error } = await supabase.rpc('update_waitlist_entry_with_token', {
      p_email: email.toLowerCase().trim(),
      p_token: waitlistToken,
      p_selected_city: updates.selected_city ?? null,
      p_has_seen_early_access: updates.has_seen_early_access ?? null,
      p_skipped_early_access: updates.skipped_early_access ?? null,
    });

    // 4. Handle errors
    if (error) {
      console.error('[Waitlist Update] RPC function error:', error);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to update waitlist entry' } 
        },
        { status: 500 }
      );
    }

    // Check result from RPC function
    if (!result || !result.success) {
      console.log('[Waitlist Update] Update failed:', {
        email: email.toLowerCase().trim(),
        error: result?.error || 'Invalid email or token',
        tokenLength: waitlistToken?.length
      });
      return NextResponse.json(
        { 
          data: null,
          error: { message: result?.error || 'Invalid email or token' } 
        },
        { status: 404 }
      );
    }

    console.log('[Waitlist Update] Successfully updated:', { 
      email, 
      updates,
      rowsUpdated: result.updated
    });

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
