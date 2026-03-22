import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { runJoinHalalDryRun } from '@/lib/import/joinhalal';
import type { ImportLimit } from '@/lib/import/joinhalal';

/**
 * POST /api/admin/import-joinhalal/dry-run
 *
 * Executes a JoinHalal dry-run preview and returns structured counts,
 * unmapped category groups, and sample records.
 *
 * Does NOT write any data to the database.
 *
 * Enforces a 90-second application-level timeout guard to ensure the
 * response completes before the Nginx (95s) and Cloudflare (100s) ceilings.
 *
 * Request body:
 * {
 *   limit: 10 | 50 | 100 | "all"  (required)
 * }
 *
 * Access: admin and moderator roles only.
 */

/** Application-level timeout budget in ms. Must be < Nginx (95s) < Cloudflare (100s). */
const ROUTE_TIMEOUT_MS = 90_000;

const VALID_LIMITS = new Set<ImportLimit | number | string>([10, 50, 100, 'all']);

export async function POST(request: Request) {
  // ─ Authentication
  const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
  const user = await getUserFromCookie();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ─ Authorization
  const hasAccess = await isAdminOrModerator(user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden — admin or moderator access required' },
      { status: 403 }
    );
  }

  // ─ Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { limit } = body as Record<string, unknown>;

  if (!VALID_LIMITS.has(limit as ImportLimit | number | string)) {
    return NextResponse.json(
      { error: 'Invalid limit. Must be one of: 10, 50, 100, "all"' },
      { status: 400 }
    );
  }

  // ─ Create service-role Supabase client (server-side only, never exposed to client)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // ─ Execute dry-run with timeout guard
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);

  try {
    const result = await runJoinHalalDryRun({
      supabase,
      limit: limit as ImportLimit,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return NextResponse.json(result);
  } catch (err) {
    clearTimeout(timeout);

    if (controller.signal.aborted) {
      return NextResponse.json(
        {
          error: 'Dry-run timed out',
          detail: `The operation exceeded the ${ROUTE_TIMEOUT_MS / 1000}s route budget. Try a smaller limit or use the CLI for large imports.`,
        },
        { status: 504 }
      );
    }

    const message = err instanceof Error ? err.message : 'Dry-run failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
