import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromCookie } from '@/lib/supabase/getUserFromCookie';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import {
  createProviderOrServiceServer,
  ProviderSubmitError,
  type ProviderSubmitErrorCode,
} from '@/features/providers/services/create-provider.server';

const shortText = (max = 200) => z.string().max(max).optional().default('');

/**
 * Explicit allowlist of client-submittable fields (ProviderFormData minus the
 * File fields). Anything else — provider_id, user_created_id,
 * provider_owner_id, review_status — is rejected outright.
 *
 * `submissionSource` is still accepted for backward compatibility with
 * already-deployed clients, but it is IGNORED: enforcement of the closed
 * recommend city list is bound to the route that handled the request
 * (#606 code review — a client-sent flag must not decide validation).
 */
const createProviderBodySchema = z
  .object({
    creationMode: z.enum(['owner', 'recommendation']),
    entityType: z.enum(['provider', 'community_service']).optional().default('provider'),
    submissionSource: z.enum(['recommend', 'import', 'owner']).optional(),
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
  })
  .strict();

/**
 * Bad-input codes the service can raise, mapped to their HTTP status and a
 * field the form can point at. `error` stays a short safe fallback for
 * non-localised clients; the UI keys its copy off `code` (#577/#582).
 */
const SUBMIT_ERROR_MAP: Record<
  ProviderSubmitErrorCode,
  { status: number; error: string; field?: string }
> = {
  CATEGORY_UNKNOWN: { status: 400, error: 'Please choose a valid category.', field: 'category' },
  CITY_NOT_SUPPORTED: {
    status: 400,
    error: 'We could not find that city. Pick a suggestion or check the spelling.',
    field: 'city',
  },
  HALAL_ATTESTATION_REQUIRED: {
    status: 400,
    error: 'Please answer all attestation questions.',
    field: 'attestation',
  },
  PROVIDER_DUPLICATE: { status: 409, error: 'This provider already exists.' },
};

/**
 * Shared POST logic for the provider submission routes. `submissionSource`
 * is decided by the route that calls this — 'recommend' only for
 * /api/providers/recommend — and stamped onto the parsed body so the
 * service never trusts a client-sent value.
 */
export async function handleProviderSubmit(
  request: NextRequest,
  submissionSource?: 'recommend',
) {
  try {
    // Resolve the actor from the session first so the rate limit can key on it.
    const user = await getUserFromCookie();
    // All submission flows require a logged-in user (#415) — the endpoint
    // enforces the gate too, not just the client.
    if (!user) {
      return NextResponse.json(
        { code: 'AUTH_REQUIRED', error: 'Authentication required' },
        { status: 401 },
      );
    }
    const userId = user.id;

    // Rate limiting: 5 submissions per hour per user
    const identifier = getClientIdentifier(request, userId);
    const isAllowed = checkRateLimit(identifier, 5, 60 * 60 * 1000, 'provider-create');
    if (!isAllowed) {
      return NextResponse.json(
        { code: 'RATE_LIMITED', error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const validation = createProviderBodySchema.safeParse(body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return NextResponse.json(
        {
          code: 'INVALID_BODY',
          error: 'Invalid submission',
          field: typeof issue?.path?.[0] === 'string' ? issue.path[0] : undefined,
        },
        { status: 400 },
      );
    }

    const formData = validation.data;
    // Route-derived source wins over anything the client sent (#606).
    formData.submissionSource = submissionSource;

    // Media must come from our own storage — no arbitrary remote URLs.
    const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
    const isStorageUrl = (url: string) => url.startsWith(storagePrefix);
    const hasBadImage = (formData.imageUrls ?? []).some((url) => !isStorageUrl(url));
    const hasBadCertificate =
      formData.certificate_url.length > 0 && !isStorageUrl(formData.certificate_url);
    if (hasBadImage || hasBadCertificate) {
      return NextResponse.json(
        { code: 'INVALID_MEDIA_URL', error: 'Invalid media URL' },
        { status: 400 },
      );
    }

    const result = await createProviderOrServiceServer({
      formData,
      actor: {
        userId,
        isOwner: formData.creationMode === 'owner',
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Provider create error:', error);
    if (error instanceof ProviderSubmitError) {
      const mapped = SUBMIT_ERROR_MAP[error.code];
      return NextResponse.json(
        {
          code: error.code,
          error: mapped.error,
          ...(mapped.field ? { field: mapped.field } : {}),
          ...(error.extras?.existing ? { existing: error.extras.existing } : {}),
        },
        { status: mapped.status },
      );
    }
    return NextResponse.json(
      { code: 'SUBMIT_FAILED', error: 'Failed to submit provider' },
      { status: 500 },
    );
  }
}
