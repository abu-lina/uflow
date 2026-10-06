'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { EditSubPageLayout } from '@/components/layout/EditSubPageLayout';
import {
  HalalAttestationFields,
  type HalalAttestationField,
} from '@/components/shared/HalalAttestationFields';
import { Button } from '@/components/ui/Button';
import { ApproveModal } from '@/features/admin/components/ApproveModal';
import { RejectModal } from '@/features/admin/components/RejectModal';
import { useLanguage } from '@/providers/LanguageProvider';
import { mdiCheck, mdiClose } from '@/lib/icons';
import { validateCertificateFile } from '@/lib/validations/certificate';

const FIELD_TO_CAMEL = {
  no_alcohol: 'noAlcohol',
  no_pork: 'noPork',
  no_gambling: 'noGambling',
} as const;

const FIELD_TO_LABELKEY: Record<HalalAttestationField, string> = {
  no_alcohol: 'halal.attestation.noAlcohol.label',
  no_pork: 'halal.attestation.noPork.label',
  no_gambling: 'halal.attestation.noGambling.label',
};

// #548 review: the decided notice interpolates the status label — it must
// be the localized label key, never the raw enum (an English token inside
// ar/tr/ur/ps RTL sentences was the leak).
const STATUS_TO_LABELKEY: Record<string, string> = {
  rejected: 'adminHalalEdit.review.status.rejected',
  removed_by_owner: 'adminHalalEdit.review.status.removedByOwner',
};

interface HalalData {
  // Tri-state (#415): true=yes, false=submitter said no, null=not sure.
  // NULL must round-trip as NULL or "unknown" silently becomes "declared no".
  noAlcohol: boolean | null;
  noPork: boolean | null;
  noGambling: boolean | null;
  verificationMethod: 'online' | 'onsite' | null;
  hasCertificate: boolean;
  certificateUrl: string | null;
  certificateFile: File | null;
}

interface ProviderMeta {
  providerName: string;
  reviewStatus: string | null;
  updatedAt: string | null;
  listingType: string | null;
}

interface GateError {
  denied: HalalAttestationField[];
  unanswered: HalalAttestationField[];
}

/** #548: shared "denied vs unanswered" group list for the red verdict panels
    — a null ("not sure") is not a denial, so admins triage the two groups
    differently (#415). Same rendering for the live local verdict and for the
    server's 422 arrays. */
function AttestationFailureGroups({
  denied,
  unanswered,
  t,
}: {
  denied: HalalAttestationField[];
  unanswered: HalalAttestationField[];
  t: (key: string) => string;
}) {
  const groups = [
    { fields: denied, groupKey: 'halal.admin.declaredNonCompliant' },
    { fields: unanswered, groupKey: 'halal.admin.unanswered' },
  ] as const;
  return (
    <>
      {groups.map(
        ({ fields, groupKey }) =>
          fields.length > 0 && (
            <div key={groupKey} className="mt-1 flex flex-col gap-1">
              <span className="text-xs font-semibold text-red-700">{t(groupKey)}:</span>
              <ul className="flex flex-col gap-1">
                {fields.map((field) => (
                  <li key={field} className="flex items-center gap-1.5 text-xs text-red-700">
                    <Icon
                      className="h-3.5 w-3.5 flex-shrink-0 text-red-500"
                      icon="material-symbols:close-small"
                    />
                    {t(FIELD_TO_LABELKEY[field])}
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </>
  );
}

function getDerivedTier(data: HalalData): { labelKey: string; color: string } | null {
  // Gold needs a real certificate — an existing stored file or one staged
  // for upload on save; a bare toggle does not earn gold (AC6.8).
  const hasRealCertificate =
    data.hasCertificate && (data.certificateUrl != null || data.certificateFile != null);
  if (hasRealCertificate)
    return {
      labelKey: 'adminHalalEdit.tier.gold',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
  if (data.verificationMethod === 'onsite')
    return {
      labelKey: 'adminHalalEdit.tier.silver',
      color: 'bg-gray-100 text-gray-800 border-gray-400',
    };
  if (data.verificationMethod === 'online')
    return {
      labelKey: 'adminHalalEdit.tier.bronze',
      color: 'bg-amber-100 text-amber-800 border-amber-400',
    };
  return null;
}

export default function EditHalalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_KEY = `admin_edit_halal_${id}`;

  const [data, setData] = useState<HalalData>({
    noAlcohol: null,
    noPork: null,
    noGambling: null,
    verificationMethod: null,
    hasCertificate: false,
    certificateUrl: null,
    certificateFile: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  // #548: provider row meta drives the review footer (status-gated actions)
  // and supplies expectedUpdatedAt for optimistic concurrency.
  const [providerMeta, setProviderMeta] = useState<ProviderMeta | null>(null);
  // A failed meta fetch used to leave a healthy-looking page whose footer
  // silently had no review actions (evidence rework item 2).
  const [metaLoadFailed, setMetaLoadFailed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [gateError, setGateError] = useState<GateError | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    attestation: true,
    verification: true,
    certificate: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    // Always fetch: provider meta (review_status, updated_at) drives the
    // review footer even when a localStorage draft supplies the answers.
    fetch(`/api/admin/providers/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`provider meta ${res.status}`);
        const json = await res.json();
        const p = json.data;
        if (!p) throw new Error('provider meta empty');
        setProviderMeta({
          providerName: p.provider_name ?? '',
          reviewStatus: p.review_status ?? null,
          updatedAt: p.updated_at ?? null,
          listingType: p.listing_type ?? null,
        });

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as HalalData;
            setData({ ...parsed, certificateFile: null });
            return;
          } catch {
            /* ignore */
          }
        }

        const fp = p.food_providers;
        const sp = p.store_providers;
        const extData = fp || sp;
        if (extData) {
          setData({
            noAlcohol: extData.no_alcohol ?? null,
            noPork: extData.no_pork ?? null,
            noGambling: extData.no_gambling ?? null,
            verificationMethod: extData.verification_method ?? null,
            hasCertificate: extData.has_certificate ?? false,
            certificateUrl: extData.certificate_url ?? null,
            certificateFile: null,
          });
        }
      })
      .catch(() => setMetaLoadFailed(true));
  }, [STORAGE_KEY, id]);

  const setAttestation = (field: HalalAttestationField, value: boolean | null) => {
    setData((prev) => ({ ...prev, [FIELD_TO_CAMEL[field]]: value }));
  };

  const setVerificationMethod = (method: 'online' | 'onsite') => {
    setData((prev) => ({ ...prev, verificationMethod: method }));
  };

  const toggleCertificate = () => {
    setData((prev) => {
      const newVal = !prev.hasCertificate;
      return {
        ...prev,
        hasCertificate: newVal,
        certificateFile: newVal ? prev.certificateFile : null,
        certificateUrl: newVal ? prev.certificateUrl : null,
      };
    });
    if (!data.hasCertificate && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateCertificateFile(file);
    if (validation !== 'ok') {
      toast.error(
        t(
          validation === 'invalidType'
            ? 'createHalal.certificateInvalidType'
            : 'createHalal.certificateTooLarge',
        ),
      );
      e.target.value = '';
      return;
    }
    setData((prev) => ({ ...prev, certificateFile: file, hasCertificate: true }));
  };

  const removeCertificate = () => {
    setData((prev) => ({ ...prev, certificateFile: null, certificateUrl: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const derivedTier = getDerivedTier(data);
  const allAttested = data.noAlcohol && data.noPork && data.noGambling;

  // Upload a staged certificate file, returning the URL to persist. Shared
  // by Save (draft) and the review actions (#548) so neither path drops a
  // staged upload.
  const uploadCertificate = useCallback(async (): Promise<string | null> => {
    if (!data.certificateFile) return data.certificateUrl;
    setIsUploading(true);
    try {
      const fileExt = data.certificateFile.name.split('.').pop();
      const filePath = `certificates/${id}-${Date.now()}.${fileExt}`;
      const supabase = (await import('@/lib/supabase/client')).supabase;
      const { error: uploadError } = await supabase.storage
        .from('provider-certificates')
        .upload(filePath, data.certificateFile);
      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from('provider-certificates').getPublicUrl(filePath);
        return publicUrl;
      }
      console.error('Certificate upload error:', uploadError);
      return data.certificateUrl;
    } catch (e) {
      console.error('Certificate upload failed:', e);
      return data.certificateUrl;
    } finally {
      setIsUploading(false);
    }
  }, [data.certificateFile, data.certificateUrl, id]);

  const handleSave = useCallback(async () => {
    const certUrl = await uploadCertificate();
    const saveData: HalalData = { ...data, certificateUrl: certUrl, certificateFile: null };
    // Mark as reviewed: set verification_method to 'online' so the edit form
    // can distinguish "never reviewed" (null) from "reviewed, not halal" (online + no attestation).
    if (!saveData.verificationMethod) {
      saveData.verificationMethod = 'online';
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    router.back();
  }, [data, STORAGE_KEY, router, uploadCertificate]);

  // #548: approve/reject straight from this page. Both actions submit the
  // page's full halal payload (three answers + verification method +
  // certificate flag and URL) so the admin's whole screen persists through
  // the single status write path — PATCH /api/admin/review-provider.
  const handleReview = useCallback(
    async (reviewStatus: 'approved' | 'rejected', feedback?: string) => {
      setReviewing(true);
      setGateError(null);
      try {
        const certUrl = await uploadCertificate();
        const res = await fetch('/api/admin/review-provider', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: id,
            reviewStatus,
            reviewFeedback: feedback ?? undefined,
            expectedUpdatedAt: providerMeta?.updatedAt ?? undefined,
            halal: {
              noAlcohol: data.noAlcohol,
              noPork: data.noPork,
              noGambling: data.noGambling,
              // Same convention as Save: 'online' marks the row as reviewed
              // when the admin never picked a method.
              verificationMethod: data.verificationMethod ?? 'online',
              hasCertificate: data.hasCertificate,
              certificateUrl: certUrl,
            },
          }),
        });

        if (res.status === 422) {
          // Gate verdict: render the server's denied/unanswered arrays so
          // server and client agree on which answers block approval (D7).
          const json = (await res.json().catch(() => ({}))) as {
            denied?: string[];
            unanswered?: string[];
          };
          setGateError({
            denied: (json.denied ?? []) as HalalAttestationField[],
            unanswered: (json.unanswered ?? []) as HalalAttestationField[],
          });
          toast.error(t('adminHalalEdit.review.gateBlocked'));
          return;
        }
        if (res.status === 409) {
          // Another reviewer changed the row — no silent retry (D7).
          toast.error(t('adminHalalEdit.review.conflict'));
          return;
        }
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          toast.error(json.error || t('adminHalalEdit.review.gateBlocked'));
          return;
        }

        // Load-bearing, not tidiness: ProviderEditForm rehydrates this key,
        // so a leftover draft would later flush through /api/admin/edit-
        // provider over the values just committed here.
        localStorage.removeItem(STORAGE_KEY);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['providers'] }),
          queryClient.invalidateQueries({ queryKey: ['provider', id] }),
          queryClient.invalidateQueries({ queryKey: ['admin-pending-providers'] }),
        ]);
        toast.success(
          t(
            reviewStatus === 'approved'
              ? 'adminHalalEdit.review.approved'
              : 'adminHalalEdit.review.rejected',
          ),
        );
        router.push(
          providerMeta?.listingType === 'store' ? '/stores?status=pending' : '/food?status=pending',
        );
      } catch {
        toast.error(t('adminHalalEdit.review.gateBlocked'));
      } finally {
        setReviewing(false);
        setApproveModalOpen(false);
        setRejectModalOpen(false);
      }
    },
    [data, id, providerMeta, queryClient, router, t, uploadCertificate, STORAGE_KEY],
  );

  // Footer state machine (D6): pending/needs_revision -> both actions;
  // approved -> approve stays mounted but disabled (unmounting it let reject
  // slide into the slot a finger had just tapped); rejected/removed_by_owner
  // -> no status action, just the notice.
  //
  // The pair is uflow's own approve/reject treatment (ProviderCard): the
  // shared Button, variant primary/danger, 48px, mdi:check/mdi:close. Both
  // block on `reviewing` AND `isUploading` — a certificate upload must not
  // leave a destructive control live. Approve opens ApproveModal rather
  // than firing: it publishes publicly and irreversibly, so the guard sits
  // on the irreversible action, mirroring RejectModal on the reversible one.
  const reviewFooter = (() => {
    // Meta fetch failed: say so where the actions would be instead of
    // silently rendering a save-only footer on a reviewable row.
    if (metaLoadFailed) {
      return (
        <p className="py-1 text-center text-xs text-danger">
          {t('adminHalalEdit.review.loadFailed')}
        </p>
      );
    }
    if (!providerMeta) return undefined;
    const status = providerMeta.reviewStatus;
    if (status === 'rejected' || status === 'removed_by_owner') {
      return (
        <p className="py-1 text-center text-xs text-content-muted">
          {t('adminHalalEdit.review.decidedNotice', {
            status: t(STATUS_TO_LABELKEY[status] ?? status),
          })}
        </p>
      );
    }
    return (
      <div className="flex gap-2">
        <Button
          aria-label={t('adminHalalEdit.review.approve')}
          className="h-12 flex-1 items-center justify-center gap-1.5"
          disabled={status === 'approved' || isUploading}
          icon={
            <div className="flex items-center">
              <Icon height={16} icon={mdiCheck} width={16} />
            </div>
          }
          loading={reviewing}
          variant="primary"
          onClick={() => setApproveModalOpen(true)}
        >
          {t('adminHalalEdit.review.approve')}
        </Button>
        <Button
          aria-label={t('adminHalalEdit.review.reject')}
          className="h-12 flex-1 items-center justify-center gap-1.5"
          disabled={reviewing || isUploading}
          icon={
            <div className="flex items-center">
              <Icon height={16} icon={mdiClose} width={16} />
            </div>
          }
          variant="danger"
          onClick={() => setRejectModalOpen(true)}
        >
          {t('adminHalalEdit.review.reject')}
        </Button>
      </div>
    );
  })();

  return (
    <EditSubPageLayout
      primaryButton={{
        // #548: Approve is the page's consequential action; saving a local
        // draft is demoted to the secondary variant so it cannot dominate.
        variant: 'secondary',
        label: isUploading ? t('adminHalalEdit.uploading') : t('common.save'),
        icon: isUploading ? undefined : 'material-symbols:save-outline',
        onClick: handleSave,
        disabled: isUploading,
        loading: isUploading,
      }}
      reviewFooter={reviewFooter}
      title={t('adminHalalEdit.title')}
    >
      <div className="flex flex-col gap-6">
        {/* Section 1: Attestation Questions */}
        <div className="flex flex-col gap-4">
          <button
            className="flex w-full items-center justify-between pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('attestation')}
          >
            <h2 className="text-lg font-medium text-[#232323]">{t('adminHalalEdit.title')}</h2>
            <Icon
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.attestation ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>

          {expandedSections.attestation && (
            <div className="space-y-3">
              {/* Neutral framing: an admin edits on someone's behalf and may
                  legitimately not know, so the oath text does not belong here
                  (A3). */}
              <p className="px-3 text-sm leading-relaxed text-[#7A7A7A]">
                {t('halal.attestation.recommendDescription')}
              </p>

              <HalalAttestationFields
                invalidFields={
                  gateError ? [...gateError.denied, ...gateError.unanswered] : undefined
                }
                values={{
                  no_alcohol: data.noAlcohol,
                  no_pork: data.noPork,
                  no_gambling: data.noGambling,
                }}
                variant="neutral"
                onChange={setAttestation}
              />

              {/* #548: the server gate's verdict, rendered under the answers
                  it judged. With 805 pending rows and 0 currently passing,
                  this is the message an admin meets most — not a toast. */}
              {gateError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Icon
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
                      icon="material-symbols:cancel-outline"
                    />
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-semibold text-red-800">
                        {t('adminHalalEdit.review.gateBlocked')}
                      </p>
                      <AttestationFailureGroups
                        denied={gateError.denied}
                        t={t}
                        unanswered={gateError.unanswered}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!allAttested && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Icon
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600"
                      icon="material-symbols:warning-outline"
                    />
                    <p className="text-xs leading-relaxed text-amber-700">
                      {t('adminHalalEdit.attestationWarning')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: Verification Method */}
        <div className="flex flex-col gap-4">
          <button
            className="flex w-full items-center justify-between pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('verification')}
          >
            <h2 className="text-lg font-medium text-[#232323]">
              {t('createHalal.verificationTitle')}
            </h2>
            <Icon
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.verification ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>

          {expandedSections.verification && (
            <div className="space-y-3">
              <p className="px-3 text-sm text-[#7A7A7A]">{t('createHalal.verificationDesc')}</p>

              <div className="flex gap-3">
                {[
                  {
                    value: 'online' as const,
                    label: t('createHalal.methodOnline'),
                    description: t('createHalal.methodOnlineDesc'),
                  },
                  {
                    value: 'onsite' as const,
                    label: t('createHalal.methodOnsite'),
                    description: t('createHalal.methodOnsiteDesc'),
                  },
                ].map((option) => {
                  const isSelected = data.verificationMethod === option.value;
                  return (
                    <button
                      key={option.value}
                      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 text-center transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-[#E5E5E5] bg-white'
                      }`}
                      type="button"
                      onClick={() => setVerificationMethod(option.value)}
                    >
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-primary' : 'border-[#999999]'
                        }`}
                      >
                        {isSelected && <div className="h-3.5 w-3.5 rounded-full bg-primary" />}
                      </div>
                      <span
                        className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-[#272727]'}`}
                      >
                        {option.label}
                      </span>
                      <span className="text-center text-[10px] leading-tight text-[#7A7A7A]">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Certificate */}
        <div className="flex flex-col gap-4">
          <button
            className="flex w-full items-center justify-between pl-3 pr-2"
            type="button"
            onClick={() => toggleSection('certificate')}
          >
            <h2 className="text-lg font-medium text-[#232323]">
              {t('createHalal.certificateTitle')}
            </h2>
            <Icon
              className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.certificate ? 'rotate-180' : ''}`}
              icon="material-symbols:expand-more"
            />
          </button>

          {expandedSections.certificate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3">
                <p className="text-xs text-[#7A7A7A]">{t('createHalal.certificateDesc')}</p>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    data.hasCertificate ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  type="button"
                  onClick={toggleCertificate}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      data.hasCertificate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {data.hasCertificate && (
                <div className="flex flex-col gap-3">
                  {data.certificateUrl && !data.certificateFile && (
                    <div className="flex w-full items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" icon="material-symbols:verified" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#272727]">
                            {t('adminHalalEdit.existingCertificate')}
                          </span>
                          <a
                            className="text-xs text-primary underline"
                            href={data.certificateUrl}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {t('adminHalalEdit.viewCertificate')}
                          </a>
                        </div>
                      </div>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                        type="button"
                        onClick={() => setData((prev) => ({ ...prev, certificateUrl: null }))}
                      >
                        <Icon
                          className="h-5 w-5 text-[#999999]"
                          icon="material-symbols:close-rounded"
                        />
                      </button>
                    </div>
                  )}

                  {data.certificateFile ? (
                    <div className="flex w-full items-center justify-between rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-primary" icon="mdi:file-document-outline" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#272727]">
                            {data.certificateFile.name}
                          </span>
                          <span className="text-xs text-[#7A7A7A]">
                            {(data.certificateFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                        type="button"
                        onClick={removeCertificate}
                      >
                        <Icon
                          className="h-5 w-5 text-[#999999]"
                          icon="material-symbols:close-rounded"
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        accept="image/*,.pdf"
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        type="file"
                        onChange={handleCertificateUpload}
                      />
                      <button
                        className="flex h-[54px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-white transition-colors hover:bg-gray-50"
                        type="button"
                      >
                        <Icon className="h-6 w-6 text-[#999999]" icon="lucide:upload" />
                        <span className="text-sm font-medium text-[#999999]">
                          {t('createHalal.certificateUpload')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Derived halal level + auto-review status */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Icon
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600"
              icon="material-symbols:info-outline"
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs leading-relaxed text-blue-700">
                {t('adminHalalEdit.derivedTierInfo')}
              </p>
              {derivedTier && (
                <span
                  className={`mt-1 inline-flex self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold ${derivedTier.color}`}
                >
                  {t('adminHalalEdit.derivedTierLabel')}: {t(derivedTier.labelKey)}
                </span>
              )}
            </div>
          </div>
        </div>

        {allAttested ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Icon
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
                icon="material-symbols:check-circle-outline"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-green-800">
                  {t('adminHalalEdit.autoApprovedTitle')}
                </p>
                <p className="text-xs leading-relaxed text-green-700">
                  {t('adminHalalEdit.autoApprovedDesc')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Icon
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
                icon="material-symbols:cancel-outline"
              />
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-800">
                  {t('adminHalalEdit.autoRejectedTitle')}
                </p>
                <p className="text-xs leading-relaxed text-red-700">
                  {t('adminHalalEdit.autoRejectedDesc')}
                </p>
                {/* B2 (#415): a "not sure" (null) is not a denial — list the two
                    groups separately so admins triage them differently. */}
                <AttestationFailureGroups
                  denied={
                    (['no_alcohol', 'no_pork', 'no_gambling'] as const).filter(
                      (f) => data[FIELD_TO_CAMEL[f]] === false,
                    ) as HalalAttestationField[]
                  }
                  t={t}
                  unanswered={
                    (['no_alcohol', 'no_pork', 'no_gambling'] as const).filter(
                      (f) => data[FIELD_TO_CAMEL[f]] === null,
                    ) as HalalAttestationField[]
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection requires a reason (Plan 059/062) */}
      <RejectModal
        isLoading={reviewing}
        isOpen={rejectModalOpen}
        providerName={providerMeta?.providerName ?? ''}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={(feedback) => handleReview('rejected', feedback)}
      />

      {/* Approval publishes publicly and irreversibly — it gets the guard. */}
      <ApproveModal
        isLoading={reviewing}
        isOpen={approveModalOpen}
        providerName={providerMeta?.providerName ?? ''}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={() => handleReview('approved')}
      />
    </EditSubPageLayout>
  );
}
