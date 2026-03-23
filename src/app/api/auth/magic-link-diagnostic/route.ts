import { NextResponse } from 'next/server';
import { getClientIP, checkIPBlocked } from '@/utils/security';
import { getClientIdentifier, getRemainingRequests } from '@/lib/rate-limit';

/**
 * User-friendly diagnostic endpoint for magic link issues
 * Users can visit this URL on their iPhone to get diagnostic information
 * GET /api/auth/magic-link-diagnostic?email=user@example.com
 * GET /api/auth/magic-link-diagnostic?email=user@example.com&ip=85.216.121.245 (admin only - requires x-admin-key header)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const adminKey = request.headers.get('x-admin-key');
  const expectedKey = process.env.ADMIN_DEBUG_KEY;
  // F-049-03: No fallback key — admin override disabled when ADMIN_DEBUG_KEY is unset.
  // Non-admin (user) diagnostic mode is unrestricted and continues below.
  
  // Allow admin to check specific IP by providing it in query params
  let ip: string;
  let identifier: string;
  
  const requestedIP = url.searchParams.get('ip');
  if (requestedIP && adminKey === expectedKey) {
    // Admin override - check the requested IP instead of visitor's IP
    ip = requestedIP;
    identifier = `ip:${ip.replace(/\s+/g, '')}`;
  } else {
    // Normal mode - use visitor's IP
    ip = getClientIP(request);
    identifier = getClientIdentifier(request);
  }
  
  const isBlocked = checkIPBlocked(ip);
  
  // Check rate limits
  const magicLinkRateLimit = getRemainingRequests(
    identifier,
    10,
    60 * 60 * 1000,
    'magic-link'
  );
  
  const verifyRateLimit = getRemainingRequests(
    identifier,
    10,
    60 * 60 * 1000,
    'verify-magic-link'
  );
  
  // Get headers for IP detection
  const headers = {
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'x-real-ip': request.headers.get('x-real-ip'),
    'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
  };
  
  const isAdminMode = requestedIP && adminKey === expectedKey;
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    ip,
    identifier,
    email: email || 'not provided',
    mode: isAdminMode ? 'admin' : 'user',
    note: isAdminMode ? 'Admin mode: Checking specific IP provided in query parameter' : 'User mode: Showing diagnostic for your current IP address',
    status: {
      ipBlocked: isBlocked,
      rateLimitExceeded: magicLinkRateLimit === 0,
      canRequestMagicLink: !isBlocked && (magicLinkRateLimit === null || magicLinkRateLimit > 0),
    },
    rateLimits: {
      magicLink: {
        remaining: magicLinkRateLimit,
        limit: 10,
        window: '1 hour',
        status: magicLinkRateLimit === 0 ? 'EXCEEDED' : magicLinkRateLimit === null ? 'NONE' : 'OK'
      },
      verify: {
        remaining: verifyRateLimit,
        limit: 10,
        window: '1 hour',
        status: verifyRateLimit === 0 ? 'EXCEEDED' : verifyRateLimit === null ? 'NONE' : 'OK'
      }
    },
    detectedIP: {
      cloudflare: headers['cf-connecting-ip'],
      forwarded: headers['x-forwarded-for'],
      real: headers['x-real-ip'],
      used: ip
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasResendKey: !!process.env.RESEND_API_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    },
    recommendations: [] as string[]
  };
  
  // Add recommendations
  if (isBlocked) {
    diagnostic.recommendations.push('Your IP address is temporarily blocked. Please wait 15 minutes or contact support.');
  }
  if (magicLinkRateLimit === 0) {
    diagnostic.recommendations.push('You have exceeded the rate limit (10 requests per hour). Please wait before requesting another magic link.');
  }
  if (!process.env.RESEND_API_KEY) {
    diagnostic.recommendations.push('Email service is not configured. Contact support immediately.');
  }
  if (diagnostic.recommendations.length === 0) {
    diagnostic.recommendations.push('No issues detected. If magic links are not working, the issue may be with email delivery. Check your spam folder.');
  }
  
  // Return as both JSON and HTML for easy viewing on mobile
  const acceptHeader = request.headers.get('accept') || '';
  const wantsHTML = acceptHeader.includes('text/html') || url.searchParams.get('format') === 'html';
  
  if (wantsHTML) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Magic Link Diagnostic</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
    .status { padding: 15px; border-radius: 8px; margin: 10px 0; }
    .ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
    .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    h1 { color: #333; }
    h2 { color: #555; margin-top: 20px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    .copy-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
    .copy-btn:hover { background: #0056b3; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🔍 Magic Link Diagnostic</h1>
  
  <div class="status ${diagnostic.status.canRequestMagicLink ? 'ok' : 'error'}">
    <strong>Status:</strong> ${diagnostic.status.canRequestMagicLink ? '✅ No issues detected' : '❌ Issues found'}
  </div>
  
  <h2>Your Information</h2>
  <p><strong>IP Address:</strong> <code>${diagnostic.ip}</code></p>
  <p><strong>Email:</strong> <code>${diagnostic.email}</code></p>
  <p><strong>Time:</strong> ${new Date(diagnostic.timestamp).toLocaleString()}</p>
  
  <h2>Checks</h2>
  <div class="status ${diagnostic.status.ipBlocked ? 'error' : 'ok'}">
    <strong>IP Blocked:</strong> ${diagnostic.status.ipBlocked ? '❌ Yes' : '✅ No'}
  </div>
  <div class="status ${diagnostic.rateLimits.magicLink.status === 'EXCEEDED' ? 'error' : diagnostic.rateLimits.magicLink.status === 'OK' ? 'ok' : 'info'}">
    <strong>Rate Limit:</strong> ${diagnostic.rateLimits.magicLink.remaining !== null ? `${diagnostic.rateLimits.magicLink.remaining} of ${diagnostic.rateLimits.magicLink.limit} remaining` : 'No active limit'}
  </div>
  
  <h2>Recommendations</h2>
  <ul>
    ${diagnostic.recommendations.map(rec => `<li>${rec}</li>`).join('')}
  </ul>
  
  <h2>Share This Information</h2>
  <p>Copy the diagnostic data below and share it with support:</p>
  <button class="copy-btn" onclick="copyToClipboard()">Copy Diagnostic Data</button>
  <pre id="json-data">${JSON.stringify(diagnostic, null, 2)}</pre>
  
  <script>
    function copyToClipboard() {
      const text = document.getElementById('json-data').textContent;
      navigator.clipboard.writeText(text).then(() => {
        alert('Copied to clipboard!');
      }).catch(() => {
        alert('Failed to copy. Please manually select and copy the text above.');
      });
    }
  </script>
</body>
</html>`;
    
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
  
  return NextResponse.json(diagnostic);
}
