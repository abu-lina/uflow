import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { ProviderFormData } from '@/providers/form-provider';
import { validateCertificateFile } from '@/lib/validations/certificate';

export interface CreateProviderResult {
  provider_id?: string;
  community_service_id?: string;
}

/**
 * Uploads entity images to the appropriate storage bucket and returns their
 * public URLs. Uploads are namespaced by user id (#415: submissions require a
 * logged-in user).
 */
async function uploadEntityImages(
  images: File[] | undefined,
  isCommunityService: boolean,
  userId: string | undefined,
): Promise<string[]> {
  if (!images || images.length === 0) {
    return [];
  }

  const bucketName = isCommunityService ? 'community-service-images' : 'provider-images';
  const folderName = isCommunityService ? 'community-services' : 'providers';
  const uploadedUrls: string[] = [];

  for (const imageFile of images) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId ?? 'unknown'}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}

/**
 * Uploads a halal certificate to the provider-certificates bucket (AC6.8).
 * Same bucket/path conventions as the admin halal edit page. Type and size
 * are re-validated at the service boundary; an upload failure throws so a
 * submission never stores has_certificate without a file behind it.
 */
async function uploadCertificate(file: File, userId: string | undefined): Promise<string> {
  const validation = validateCertificateFile(file);
  if (validation !== 'ok') {
    throw new Error(`Certificate file rejected: ${validation}`);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId ?? 'unknown'}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `certificates/${fileName}`;

  const { error } = await supabase.storage.from('provider-certificates').upload(filePath, file);
  if (error) {
    console.error('Error uploading certificate:', error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('provider-certificates').getPublicUrl(filePath);
  return publicUrl;
}

/**
 * Creates a provider or community service from form data.
 * Uploads any files to storage, then hands the writes to the /api/providers
 * route, which performs all inserts server-side with the service-role client
 * (anon RLS policies only allow the providers insert — child tables would
 * fail with 42501 from the browser).
 *
 * @param formData - The form data containing all provider/service information
 * @param user - The authenticated user; all submission flows require login (#415)
 * @returns The created entity ID (provider_id or community_service_id)
 */
// AC5.9: a second submission with the same identity while one is in flight
// returns the in-flight promise instead of inserting a duplicate provider.
const inFlightSubmissions = new Map<string, Promise<CreateProviderResult>>();

export async function createProviderOrService(
  formData: ProviderFormData,
  user: User | null,
): Promise<CreateProviderResult> {
  const dedupeKey = JSON.stringify([
    formData.title,
    formData.category,
    formData.city,
    user?.id ?? null,
    formData.creationMode,
  ]);
  const existing = inFlightSubmissions.get(dedupeKey);
  if (existing) return existing;
  const submission = doCreateProviderOrService(formData, user).finally(() =>
    inFlightSubmissions.delete(dedupeKey),
  );
  inFlightSubmissions.set(dedupeKey, submission);
  return submission;
}

async function doCreateProviderOrService(
  formData: ProviderFormData,
  user: User | null,
): Promise<CreateProviderResult> {
  // #415: all submission flows require a logged-in user; the submitter is
  // identified by user_created_id (no email is collected from recommenders).
  // Throw a readable error if a client gate is ever bypassed — the server
  // route derives the actor from the session regardless of this parameter.
  if (!user) {
    throw new Error('Authentication required to create a provider or service');
  }
  const isCommunityService = formData.category === '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';

  // Upload images if any exist
  const uploadedUrls = await uploadEntityImages(formData.images, isCommunityService, user.id);

  // AC6.8: upload the certificate (if any) before submitting so
  // certificate_url always points at a stored file.
  const certificateUrl = formData.certificate_file
    ? await uploadCertificate(formData.certificate_file, user.id)
    : formData.certificate_url || '';

  const payload: Record<string, unknown> = {
    ...formData,
    certificate_url: certificateUrl,
    imageUrls: uploadedUrls,
  };
  delete payload.images;
  delete payload.certificate_file;

  const response = await fetch('/api/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as CreateProviderResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? `Provider submission failed (${response.status})`);
  }

  return data;
}
