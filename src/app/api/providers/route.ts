import { NextRequest } from 'next/server';
import { handleProviderSubmit } from './handler';

/**
 * Generic provider submissions: owner-mode create and the import UI (both
 * keep free-text cities; the import UI's cities come from OSM). The
 * recommend flow posts to /api/providers/recommend, which is the only path
 * where the closed city list is enforced (#606).
 */
export async function POST(request: NextRequest) {
  return handleProviderSubmit(request);
}
