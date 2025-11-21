/**
 * Admin audit logging
 * Logs admin actions for compliance and security
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

export interface AdminAuditLog {
  action: string;
  admin_user_id: string;
  target_type: 'provider' | 'user' | 'system';
  target_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  targetType: 'provider' | 'user' | 'system',
  targetId: string,
  details: Record<string, unknown> = {},
  metadata?: { ipAddress?: string; userAgent?: string }
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    // Check if audit_logs table exists, if not, just log to console
    const { error } = await supabase.from('admin_audit_logs').insert({
      admin_user_id: adminUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: metadata?.ipAddress,
      user_agent: metadata?.userAgent,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // If table doesn't exist, log to console as fallback
      console.warn('[Admin Audit] Table not found, logging to console:', {
        adminUserId,
        action,
        targetType,
        targetId,
        details,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Fallback to console logging if database insert fails
    console.error('[Admin Audit] Failed to log action:', {
      adminUserId,
      action,
      targetType,
      targetId,
      details,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || undefined;
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

