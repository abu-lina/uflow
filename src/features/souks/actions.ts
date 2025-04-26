'use server';

import { revalidatePath } from 'next/cache';
import { getSouks, createSouk, updateSouk, deleteSouk } from '@/services/souks/souks';
import { toggleBookmark } from '@/services/souks/bookmarks';
import { createOffer, updateOfferStatus } from '@/services/souks/offers';
import { incrementSoukViews } from '@/services/souks/views';
import { createServerClient } from '@/lib/database/supabase-server';
import type { Souk, SoukFilter, SoukSortOption } from './types';
import type { Database } from '@/types/database';

export async function fetchSouks(
  filter?: SoukFilter,
  sort?: SoukSortOption,
  page = 1,
  pageSize = 10
) {
  return getSouks(filter, sort, page, pageSize);
}

export async function createSoukAction(souk: Database['public']['Tables']['souks']['Insert']) {
  const result = await createSouk(souk);
  revalidatePath('/souks');
  return result;
}

export async function updateSoukAction(id: string, souk: Partial<Souk>) {
  const result = await updateSouk(id, souk);
  revalidatePath(`/souks/${id}`);
  revalidatePath('/souks');
  return result;
}

export async function deleteSoukAction(id: string) {
  await deleteSouk(id);
  revalidatePath('/souks');
  revalidatePath(`/souks/${id}`);
}

export async function toggleBookmarkAction(soukId: string) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const result = await toggleBookmark(session.user.id, soukId);
  revalidatePath(`/souks/${soukId}`);
  revalidatePath('/bookmarks');
  return result;
}

export async function createOfferAction(soukId: string, price: number, title: string, message?: string) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const result = await createOffer({
    souk_id: soukId,
    price,
    title,
    description: message,
    status: 'draft'
  });
  revalidatePath(`/souks/${soukId}`);
  return result;
}

export async function updateOfferStatusAction(offerId: string, status: 'accepted' | 'rejected') {
  let mappedStatus: 'published' | 'suspended';
  if (status === 'accepted') mappedStatus = 'published';
  else mappedStatus = 'suspended';
  const result = await updateOfferStatus(offerId, mappedStatus);
  revalidatePath(`/souks/${result.souk_id}`);
  return result;
}

export async function trackViewAction(soukId: string) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  await incrementSoukViews(soukId, session?.user?.id);
  revalidatePath(`/souks/${soukId}`);
} 