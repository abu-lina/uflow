/**
 * Validation schemas for the public provider submission flows (#415, AC5.1/5.2).
 * One schema per flow; enforced in each flow's submit handler so the error
 * can name the missing field (AC5.3).
 */

import { z } from 'zod';

/**
 * Tri-state attestation (#415): true = yes, false = no, null = deliberate
 * "not sure". undefined (question never touched) is rejected, so the user
 * must make a deliberate choice on each question.
 */
const answeredAttestation = z.union([z.boolean(), z.null()]);

/**
 * Recommend flow required set: name, city, category, all three halal answers.
 * Recommending requires a logged-in user; the submitter is identified by
 * user_created_id, so no email or consent fields exist here.
 */
export const recommendSubmissionSchema = z.object({
  title: z.string().trim().min(1),
  city: z.string().trim().min(1),
  category: z.string().trim().min(1),
  no_alcohol: answeredAttestation,
  no_pork: answeredAttestation,
  no_gambling: answeredAttestation,
});

/**
 * Import flow required set: all three halal answers. Other required fields
 * are already enforced by the import form's own per-field checks.
 */
export const importSubmissionSchema = z.object({
  no_alcohol: answeredAttestation,
  no_pork: answeredAttestation,
  no_gambling: answeredAttestation,
});

/**
 * Owner flow required set: the existing basics set (title, category, at least
 * one offer) plus a full address (street, zip, city, country), at least
 * one image, and all three halal answers. Online businesses are exempt from
 * the address requirement. The halal step is part of the wizard for every
 * owner submission, so the answers are required uniformly; the service-layer
 * guard in mutations.ts scopes its enforcement to food/store.
 */
export const ownerSubmissionSchema = z
  .object({
    title: z.string().trim().min(1),
    category: z.string().trim().min(1),
    offers_ids: z.array(z.string()).min(1),
    images: z.array(z.unknown()).min(1),
    isOnlineBusiness: z.boolean(),
    street: z.string().optional(),
    zip: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    no_alcohol: answeredAttestation,
    no_pork: answeredAttestation,
    no_gambling: answeredAttestation,
  })
  .superRefine((data, ctx) => {
    if (data.isOnlineBusiness) return;
    for (const field of ['street', 'zip', 'city', 'country'] as const) {
      if (!data[field] || data[field].trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required`,
        });
      }
    }
  });

/**
 * Maps a schema field path to the translation key of its user-visible label,
 * so a failed validation can name the field (AC5.3).
 */
export const submissionFieldLabelKeys: Record<string, string> = {
  title: 'create.basics.titleLabel',
  category: 'create.basics.categoryLabel',
  offers_ids: 'create.basics.whatIOffer',
  city: 'create.location.city',
  street: 'create.location.street',
  zip: 'create.location.zip',
  country: 'create.location.country',
  images: 'create.media.images',
  no_alcohol: 'halal.attestation.noAlcohol.label',
  no_pork: 'halal.attestation.noPork.label',
  no_gambling: 'halal.attestation.noGambling.label',
};

/** Field path of the first validation issue, for naming it in the error. */
export function firstIssueField(error: z.ZodError): string {
  return String(error.issues[0]?.path[0] ?? '');
}
