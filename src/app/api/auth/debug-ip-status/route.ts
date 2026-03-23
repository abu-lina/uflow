import { NextResponse } from 'next/server';
import { getClientIP, checkIPBlocked, unblockIP, getAllBlockedIPs, clearAllBlockedIPs } from '@/utils/security';
import { getClientIdentifier, getRemainingRequests } from '@/lib/rate-limit';

/**
 * Diagnostic endpoint to check IP blocking and rate limit status
 * This helps debug magic link issues for specific users
 * 
 * GET /api/auth/debug-ip-status - Check status for current IP
 * GET /api/auth/debug-ip-status?list=all - List all blocked IPs (admin only)
 * POST /api/auth/debug-ip-status?action=unblock&ip=xxx - Unblock an IP (admin only)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const listAll = url.searchParams.get('list') === 'all';
  
  // Check if admin wants to list all blocked IPs
  if (listAll) {
    const adminKey = request.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_DEBUG_KEY;
    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Admin debug key not configured.' },
        { status: 401 }
      );
    }
    
    if (adminKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin key required to list all blocked IPs.' },
        { status: 401 }
      );
    }
    
    const blockedIPs = getAllBlockedIPs();
    
    return NextResponse.json({
      success: true,
      count: blockedIPs.length,
      blockedIPs,
      timestamp: new Date().toISOString(),
      note: 'This list only shows currently blocked IPs. Expired blocks are automatically removed.'
    });
  }
  
  // Normal mode: check status for current IP
  const ip = getClientIP(request);
  const identifier = getClientIdentifier(request);
  
  const isBlocked = checkIPBlocked(ip);
  
  // Check rate limits for magic-link endpoint (updated to reflect new limits)
  const magicLinkRateLimit = getRemainingRequests(
    identifier,
    10, // 10 requests per hour (updated)
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
        limit: 10, // Updated
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
    note: 'If isBlocked is true, your IP has been temporarily blocked. Contact support or wait for the block to expire. Use ?list=all with admin key to see all blocked IPs.'
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const targetIP = url.searchParams.get('ip');
  
  // F-049-03: No hardcoded fallback key — require explicit env var
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.ADMIN_DEBUG_KEY;
  
  if (!expectedKey || adminKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin key required.' },
      { status: 401 }
    );
  }
  
  // Try to parse request body for JSON payload
  let body: { action?: string; ip?: string; ips?: string[] } = {};
  try {
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await request.json();
    }
  } catch {
    // Body parsing failed, use query params only
  }
  
  // Use body values if available, otherwise fall back to query params
  const finalAction = body.action || action;
  const finalIP = body.ip || targetIP;
  const ipsToUnblock = body.ips || (finalIP ? [finalIP] : []);
  
  if (finalAction === 'unblock') {
    if (ipsToUnblock.length === 0) {
      return NextResponse.json(
        { error: 'No IP address provided. Use ?ip=xxx or {"ip": "xxx"} in body' },
        { status: 400 }
      );
    }
    
    const results = ipsToUnblock.map(ip => {
      const wasBlocked = checkIPBlocked(ip);
      unblockIP(ip);
      return {
        ip,
        unblocked: true,
        wasBlocked
      };
    });
    
    return NextResponse.json({
      success: true,
      message: `Unblocked ${results.length} IP address(es)`,
      results
    });
  }
  
  if (finalAction === 'unblock-all') {
    const blockedBefore = getAllBlockedIPs();
    clearAllBlockedIPs();
    
    return NextResponse.json({
      success: true,
      message: `Unblocked all ${blockedBefore.length} blocked IP address(es)`,
      unblockedCount: blockedBefore.length,
      unblockedIPs: blockedBefore.map(b => b.ip)
    });
  }
  
  return NextResponse.json(
    { error: 'Invalid action. Use action=unblock or action=unblock-all' },
    { status: 400 }
  );
}
