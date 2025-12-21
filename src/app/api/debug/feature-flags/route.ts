import { NextResponse } from 'next/server';
import { getFeatureFlag } from '@/config/feature-flags';

/**
 * GET /api/debug/feature-flags
 * 
 * Debug endpoint to check feature flag values
 * Only works in development
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  const isAppLaunched = getFeatureFlag('isAppLaunched');
  const envValue = process.env.NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED;

  return NextResponse.json({
    isAppLaunched,
    envValue,
    envValueRaw: process.env.NEXT_PUBLIC_FEATURE_ISAPPLAUNCHED,
    nodeEnv: process.env.NODE_ENV,
    message: isAppLaunched 
      ? 'App is launched - should redirect to /providers' 
      : 'App is NOT launched - should redirect to /waitlist',
  });
}
