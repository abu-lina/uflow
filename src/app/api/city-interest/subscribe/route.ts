import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';

const cityInterestBodySchema = z.object({
  cityName: z.string(),
});

const optionalEmailSchema = z.string().email('Invalid email format');

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 requests per hour per IP
    const identifier = getClientIdentifier(request);
    const isAllowed = checkRateLimit(identifier, 20, 60 * 60 * 1000, 'city-interest');

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = cityInterestBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const cityName = validation.data.cityName;
    const rawEmail = typeof body?.email === 'string' ? body.email : undefined;

    if (rawEmail) {
      const emailValidation = optionalEmailSchema.safeParse(rawEmail);
      if (!emailValidation.success) {
        return NextResponse.json(
          { error: emailValidation.error.issues[0]?.message ?? 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Sanitize city name - trim and enforce 100 char max
    const sanitizedCityName = cityName.trim().slice(0, 100);

    if (sanitizedCityName.length === 0) {
      return NextResponse.json(
        { error: 'City name is required' },
        { status: 400 }
      );
    }

    // Check for authenticated session
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userEmail: string;

    if (user && user.email) {
      // Authenticated user - use session email
      userEmail = user.email.toLowerCase();
    } else {
      // Anonymous user - require email in body
      if (!rawEmail) {
        return NextResponse.json(
          { error: 'Email is required for anonymous users' },
          { status: 400 }
        );
      }
      // Normalize email to lowercase
      userEmail = rawEmail.toLowerCase();
    }

    // Use admin client to upsert waitlist entry (bypasses RLS)
    const admin = getSupabaseAdmin();
    const { error: upsertError } = await admin
      .from('waitlist')
      .upsert(
        {
          email: userEmail,
          selected_city: sanitizedCityName,
        },
        { onConflict: 'email' }
      );

    if (upsertError) {
      console.error('City interest upsert error:', upsertError);
      return NextResponse.json(
        { error: 'Failed to register interest' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      city: sanitizedCityName,
    });
  } catch (error) {
    console.error('City interest subscribe error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
