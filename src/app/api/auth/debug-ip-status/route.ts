import { NextResponse } from 'next/server';
import { getClientIP, checkIPBlocked, unblockIP } from '@/utils/security';
import { getClientIdentifier, getRemainingRequests } from '@/lib/rate-limit';

/**
 * Diagnostic endpoint to check IP blocking and rate limit status
 * This helps debug magic link issues for specific users
 * 
 * GET /api/auth/debug-ip-status - Check status
 * POST /api/auth/debug-ip-status?action=unblock&ip=xxx - Unblock an IP (admin only)
 */
export async function GET(request: Request) {
  const ip = getClientIP(request);
  const identifier = getClientIdentifier(request);
  
  const isBlocked = checkIPBlocked(ip);
  
  // Check rate limits for magic-link endpoint
  const magicLinkRateLimit = getRemainingRequests(
    identifier,
    5, // 5 requests per hour
    60 * 60 * 1000, // 1 hour window
    'magic-link'
  );
  
  const verifyRateLimit = getRemainingRequests(
    identifier,
    10, // 10 requests per hour
    60 * 60 * 1000, // 1 hour window
    'verify-magic-link'
  );
  
  return NextResponse.json({
    ip,
    identifier,
    isBlocked,
    rateLimits: {
      magicLink: {
        remaining: magicLinkRateLimit,
        limit: 5,
        window: '1 hour'
      },
      verify: {
        remaining: verifyRateLimit,
        limit: 10,
        window: '1 hour'
      }
    },
    headers: {
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    },
    note: 'If isBlocked is true, your IP has been temporarily blocked. Contact support or wait for the block to expire.'
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const targetIP = url.searchParams.get('ip');
  
  // Simple admin check - in production, use proper authentication
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.ADMIN_DEBUG_KEY || 'debug-key-change-in-production';
  
  if (adminKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin key required.' },
      { status: 401 }
    );
  }
  
  if (action === 'unblock' && targetIP) {
    unblockIP(targetIP);
    return NextResponse.json({
      success: true,
      message: `IP ${targetIP} has been unblocked`,
      ip: targetIP
    });
  }
  
  return NextResponse.json(
    { error: 'Invalid action or missing IP parameter' },
    { status: 400 }
  );
}
