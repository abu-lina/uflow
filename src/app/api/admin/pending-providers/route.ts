import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { logger, getRequestMetadata } from '@/lib/logging/structuredLogger';
import { pendingProvidersQuerySchema } from '@/lib/validations/adminSchemas';
import { getPendingProviders } from '@/services/admin/providers';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit';

/**
 * GET /api/admin/pending-providers
 * 
 * Get list of providers pending review
 * Only admins and moderators can access this endpoint
 * 
 * Query parameters:
 * - status?: 'pending' | 'needs_revision' (default: 'pending')
 * - limit?: number (default: 50)
 * - offset?: number (default: 0)
 */
export async function GET(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    // Check authentication
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization - only admin and moderator can view pending providers
    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      logger.warn(
        'Forbidden access attempt to pending-providers API',
        { userId: user.id, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Forbidden - Admin or Moderator access required' },
        { status: 403 }
      );
    }

    // Rate limiting - 100 requests per hour per user
    const identifier = getClientIdentifier(request, user.id);
    const isRateLimited = !rateLimiters.adminProviders.perHour(identifier);
    if (isRateLimited) {
      logger.warn(
        'Rate limit exceeded for pending-providers API',
        { userId: user.id, identifier, ...getRequestMetadata(request) }
      );
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      status: searchParams.get('status') || 'pending',
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    };

    let validatedParams;
    try {
      validatedParams = pendingProvidersQuerySchema.parse(queryParams);
    } catch (validationError) {
      if (validationError instanceof Error) {
        logger.warn(
          'Invalid query parameters',
          { queryParams, error: validationError.message },
          { ...getRequestMetadata(request), userId: user.id }
        );
      }
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validationError instanceof Error ? validationError.message : 'Validation failed' },
        { status: 400 }
      );
    }

    // Fetch pending providers using service layer
    const result = await getPendingProviders(validatedParams.status, {
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    });

    return NextResponse.json({
      providers: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error(
      'Error in pending-providers API',
      error instanceof Error ? error : new Error(String(error)),
      {},
      getRequestMetadata(request)
    );
    
    // Sanitize error message in production
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to fetch pending providers'
      : error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

