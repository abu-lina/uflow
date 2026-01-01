import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/waitlist/subscribe-city
 * 
 * Subscribe to email notifications for a city (updates waitlist entry with selected_city)
 * 
 * Request body:
 * {
 *   email: string,
 *   cityName: string,
 *   waitlistToken?: string
 * }
 * 
 * Rate limiting: 20 requests per hour per IP
 */
const subscribeCitySchema = z.object({
  email: z.string().email('Invalid email address'),
  cityName: z.string().min(1, 'City name is required'),
  waitlistToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // 1. Rate limiting - 20 requests per hour per IP
    const identifier = getClientIdentifier(request);
    const isAllowed = checkRateLimit(identifier, 20, 60 * 60 * 1000, 'waitlist-subscribe-city');
    
    if (!isAllowed) {
      console.log('[Subscribe City] Rate limit exceeded for:', identifier);
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
    
    // Validate request body
    const bodyWithToken = {
      ...body,
      waitlistToken: finalToken,
    };
    
    const validation = subscribeCitySchema.safeParse(bodyWithToken);
    
    if (!validation.success) {
      console.log('[Subscribe City] Validation failed:', validation.error.errors);
      const firstError = validation.error.errors[0];
      const errorMessage = firstError?.message || 'Invalid request data';
      return NextResponse.json(
        { 
          data: null,
          error: { message: errorMessage } 
        },
        { status: 400 }
      );
    }

    const { email, cityName, waitlistToken } = validation.data;

    // 3. Update waitlist entry using RPC function
    const supabase = createSupabaseServerClient();

    console.log('[Subscribe City] Subscribing to city:', { 
      email: email.toLowerCase().trim(), 
      cityName,
      tokenLength: waitlistToken?.length 
    });

    // Call RPC function to update waitlist entry with selected_city
    // Function validates token and bypasses RLS using SECURITY DEFINER
    const { data: result, error } = await supabase.rpc('update_waitlist_entry_with_token', {
      p_email: email.toLowerCase().trim(),
      p_token: waitlistToken || '',
      p_selected_city: cityName,
      p_has_seen_early_access: null,
      p_skipped_early_access: null,
    });

    // 4. Handle errors
    if (error) {
      console.error('[Subscribe City] RPC function error:', error);
      return NextResponse.json(
        { 
          data: null,
          error: { message: 'Failed to subscribe to city updates' } 
        },
        { status: 500 }
      );
    }

    // Check result from RPC function
    if (!result || !result.success) {
      console.log('[Subscribe City] Subscription failed:', {
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

    console.log('[Subscribe City] Successfully subscribed:', { 
      email, 
      cityName,
      rowsUpdated: result.updated
    });

    // 5. Return success response
    return NextResponse.json(
      { 
        data: { success: true, cityName },
        error: null 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Subscribe City] Unexpected error:', error);
    
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


