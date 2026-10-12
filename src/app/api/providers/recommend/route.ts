import { NextRequest } from 'next/server';
import { handleProviderSubmit } from '../handler';

/**
 * Recommend-flow submissions (#606). Identical to POST /api/providers
 * except the closed city list is enforced — bound to this route, not to
 * any client-sent flag: a body without submissionSource is still checked,
 * and a body claiming 'recommend' on the generic route is ignored.
 */
export async function POST(request: NextRequest) {
  return handleProviderSubmit(request, 'recommend');
}
