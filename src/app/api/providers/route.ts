import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { createProviderOrServiceServer } from '@/features/providers/services/create-provider.server';

const shortText = (max = 200) => z.string().max(max).optional().default('');

/**
 * Explicit allowlist of client-submittable fields (ProviderFormData minus the
 * File fields). Anything else — provider_id, user_created_id,
 * provider_owner_id, review_status — is rejected outright.
 */
const createProviderBodySchema = z
  .object({
    creationMode: z.enum(['owner', 'recommendation']),
    entityType: z.enum(['provider', 'community_service']).optional().default('provider'),
    title: z.string().trim().min(1, 'Title is required').max(200),
    category: z.union([z.literal(''), z.string().uuid()]),
    description: z.string().max(5000).optional().default(''),
    isOnlineBusiness: z.boolean().optional().default(false),
    street: shortText(),
    zip: z.string().max(20).optional().default(''),
    city: shortText(100),
    country: shortText(100),
    latitude: z.number().min(-90).max(90).nullable().optional().default(null),
    longitude: z.number().min(-180).max(180).nullable().optional().default(null),
    showAddress: z.boolean().optional().default(true),
    website: shortText(500),
    instagram: shortText(),
    phone: z.string().max(50).optional().default(''),
    email: z.string().max(320).optional().default(''),
    offers_ids: z.array(z.string().uuid()).max(100).optional().default([]),
    needs_ids: z.array(z.string().uuid()).max(100).optional().default([]),
    selectedCommunityServiceIds: z.array(z.string().uuid()).max(100).optional().default([]),
    tags: z.array(z.string().max(100)).max(50).optional().default([]),
    socialCategory: shortText(),
    socialTitle: shortText(),
    socialDescription: z.string().max(2000).optional().default(''),
    no_alcohol: z.boolean().nullable().optional(),
    no_pork: z.boolean().nullable().optional(),
    no_gambling: z.boolean().nullable().optional(),
    verification_method: z.string().max(50).optional().default(''),
    has_certificate: z.boolean().optional().default(false),
    certificate_url: z.string().max(2000).optional().default(''),
    imageUrls: z.array(z.string().url()).max(10).optional(),
    userEmail: z.string().email().optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    // Resolve the actor from the session first so the rate limit can key on it.
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Rate limiting: 5 submissions per hour per IP/user
    const identifier = getClientIdentifier(request, userId ?? undefined);
    const isAllowed = checkRateLimit(identifier, 5, 60 * 60 * 1000, 'provider-create');
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validation = createProviderBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 },
      );
    }

    const formData = validation.data;

    // Media must come from our own storage — no arbitrary remote URLs.
    const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
    const isStorageUrl = (url: string) => url.startsWith(storagePrefix);
    const hasBadImage = (formData.imageUrls ?? []).some((url) => !isStorageUrl(url));
    const hasBadCertificate =
      formData.certificate_url.length > 0 && !isStorageUrl(formData.certificate_url);
    if (hasBadImage || hasBadCertificate) {
      return NextResponse.json({ error: 'Invalid media URL' }, { status: 400 });
    }

    const result = await createProviderOrServiceServer({
      formData,
      actor: {
        userId,
        isOwner: formData.creationMode === 'owner' && userId !== null,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Provider create error:', error);
    return NextResponse.json({ error: 'Failed to submit provider' }, { status: 500 });
  }
}
