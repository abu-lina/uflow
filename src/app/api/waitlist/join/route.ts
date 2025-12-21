import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { waitlistSchema } from '@/lib/validation/waitlistSchemas';
import { sendWaitlistConfirmationEmail } from '@/services/email/waitlistEmail';
import { generateWaitlistToken } from '@/lib/utils/waitlist-token';
import type { WaitlistResponse } from '@/types/waitlist';

/**
 * Get client IP address from request headers
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

/**
 * POST /api/waitlist/join
 * 
 * Join the waitlist with email and optional provider status
 * 
 * Request body:
 * {
 *   email: string,
 *   isProvider: boolean | null
 * }
 * 
 * Rate limiting: 10 requests per hour per IP
 */
export async function POST(request: Request) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // 1. Rate limiting - 10 requests per hour per IP
    const identifier = getClientIdentifier(request);
    const isAllowed = checkRateLimit(identifier, 10, 60 * 60 * 1000, 'waitlist-join');
    
    if (!isAllowed) {
      console.log('[Waitlist] Rate limit exceeded for:', identifier);
      return NextResponse.json<WaitlistResponse>(
        { 
          data: null,
          error: { message: 'Too many requests. Please try again later.' } 
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = waitlistSchema.safeParse(body);
    
    if (!validation.success) {
      console.log('[Waitlist] Validation failed:', validation.error.errors);
      return NextResponse.json<WaitlistResponse>(
        { 
          data: null,
          error: { message: 'Please enter a valid email address' } 
        },
        { status: 400 }
      );
    }

    const { email, isProvider } = validation.data;

    // 3. Generate secure waitlist token
    const waitlistToken = generateWaitlistToken();

    // 4. Insert into database
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        is_provider: isProvider,
        waitlist_token: waitlistToken,
        ip_address: ip,
        user_agent: userAgent,
      });
    // Note: We don't use .select() because RLS doesn't allow SELECT on waitlist table
    // The insert will succeed and we can return success without reading the data

    // 5. Handle duplicate email (unique constraint violation)
    if (error) {
      // PostgreSQL unique constraint violation code
      if (error.code === '23505') {
        console.log('[Waitlist] Duplicate email attempt:', email);
        return NextResponse.json<WaitlistResponse>(
          { 
            data: null,
            error: { message: "You're already on the waitlist!" } 
          },
          { status: 409 }
        );
      }

      // Other database errors
      console.error('[Waitlist] Database error:', error);
      return NextResponse.json<WaitlistResponse>(
        { 
          data: null,
          error: { message: 'An error occurred. Please try again.' } 
        },
        { status: 500 }
      );
    }

    // 6. Send confirmation email (async, don't block response)
    // Fire and forget - we don't want email failures to block signup
    sendWaitlistConfirmationEmail(email, isProvider).catch((error) => {
      console.error('[Waitlist] Failed to send confirmation email:', error);
    });

    console.log('[Waitlist] New signup:', { email, isProvider, ip });

    // 7. Set waitlist token as HTTP-only cookie (secure, 30 days)
    const response = NextResponse.json<WaitlistResponse>(
      { 
        data: { 
          success: true,
          waitlistToken
        },
        error: null 
      },
      { status: 201 }
    );

    // Set HTTP-only cookie for token persistence
    response.cookies.set('waitlist_token', waitlistToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('[Waitlist] Unexpected error:', error);
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json<WaitlistResponse>(
        { 
          data: null,
          error: { message: 'Invalid request data' } 
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json<WaitlistResponse>(
      { 
        data: null,
        error: { message: 'An error occurred. Please try again.' } 
      },
      { status: 500 }
    );
  }
}

