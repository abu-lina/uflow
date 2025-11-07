import { NextResponse } from 'next/server';

/**
 * GET /api/debug/vapid
 * 
 * Debug endpoint to check if VAPID key is available
 * Only works in development
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  return NextResponse.json({
    configured: !!publicKey && publicKey.trim() !== '',
    publicKeyExists: !!publicKey,
    publicKeyLength: publicKey?.length || 0,
    publicKeyPreview: publicKey ? `${publicKey.substring(0, 20)}...` : 'not set',
    privateKeyExists: !!privateKey,
    emailExists: !!email,
    nodeEnv: process.env.NODE_ENV,
    // Don't expose actual keys in response
  });
}

