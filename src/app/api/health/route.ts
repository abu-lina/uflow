import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 12345.67
 *                 environment:
 *                   type: string
 *                   example: "production"
 *                 appEnv:
 *                   type: string
 *                   enum: [uat, production, development]
 *                 supabaseProjectRef:
 *                   type: string
 *                   nullable: true
 *                   example: "abcd1234"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *       500:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 error:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
const APP_ENVS = ['uat', 'production', 'development'] as const;

function getAppEnv(): (typeof APP_ENVS)[number] {
  const value = process.env.APP_ENV;
  return APP_ENVS.find((env) => env === value) ?? 'development';
}

function getSupabaseProjectRef(): string | null {
  try {
    const { hostname } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    if (hostname === '127.0.0.1' || hostname === 'localhost') return 'local';
    return hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Basic health check
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      appEnv: getAppEnv(),
      supabaseProjectRef: getSupabaseProjectRef(),
      version: process.env.npm_package_version || '1.0.0',
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
