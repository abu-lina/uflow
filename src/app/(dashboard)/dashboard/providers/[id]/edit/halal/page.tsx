'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';

import { EditSubPageLayout } from '@/components/layout/EditSubPageLayout';
import {
  HalalAttestationFields,
  type HalalAttestationField,
} from '@/components/shared/HalalAttestationFields';
import { useLanguage } from '@/providers/LanguageProvider';
import { validateCertificateFile } from '@/lib/validations/certificate';
import type { DerivedReviewStatus } from '@/utils/halal-derivation';

const FIELD_TO_CAMEL = {
  no_alcohol: 'noAlcohol',
  no_pork: 'noPork',
  no_gambling: 'noGambling',
} as const;

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
  reviewStatus?: DerivedReviewStatus;
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    attestation: true,
    verification: true,
    certificate: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
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

    fetch(`/api/admin/providers/${id}`)
      .then((res) => res.json())
      .then((json) => {
        const fp = json.data?.food_providers;
        const sp = json.data?.store_providers;
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
      .catch(() => {});
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

  const handleSave = useCallback(async () => {
    let certUrl = data.certificateUrl;
    if (data.certificateFile) {
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
          certUrl = publicUrl;
        } else {
          console.error('Certificate upload error:', uploadError);
        }
      } catch (e) {
        console.error('Certificate upload failed:', e);
      }
      setIsUploading(false);
    }

    // Do NOT store reviewStatus in localStorage — the admin chooses review
    // status explicitly via the Reject/Approve buttons on the main edit page.
    const saveData: HalalData = { ...data, certificateUrl: certUrl, certificateFile: null };
    delete saveData.reviewStatus;
    // Mark as reviewed: set verification_method to 'online' so the edit form
    // can distinguish "never reviewed" (null) from "reviewed, not halal" (online + no attestation).
    if (!saveData.verificationMethod) {
      saveData.verificationMethod = 'online';
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    router.back();
  }, [data, id, STORAGE_KEY, router]);

  return (
    <EditSubPageLayout
      primaryButton={{
        label: isUploading ? t('adminHalalEdit.uploading') : t('common.save'),
        icon: isUploading ? undefined : 'material-symbols:save-outline',
        onClick: handleSave,
        disabled: isUploading,
        loading: isUploading,
      }}
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
                values={{
                  no_alcohol: data.noAlcohol,
                  no_pork: data.noPork,
                  no_gambling: data.noGambling,
                }}
                variant="neutral"
                onChange={setAttestation}
              />

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
                {(
                  [
                    {
                      rows: [
                        {
                          failed: data.noAlcohol === false,
                          labelKey: 'halal.attestation.noAlcohol.label',
                        },
                        {
                          failed: data.noPork === false,
                          labelKey: 'halal.attestation.noPork.label',
                        },
                        {
                          failed: data.noGambling === false,
                          labelKey: 'halal.attestation.noGambling.label',
                        },
                      ],
                      groupKey: 'halal.admin.declaredNonCompliant',
                    },
                    {
                      rows: [
                        {
                          failed: data.noAlcohol === null,
                          labelKey: 'halal.attestation.noAlcohol.label',
                        },
                        {
                          failed: data.noPork === null,
                          labelKey: 'halal.attestation.noPork.label',
                        },
                        {
                          failed: data.noGambling === null,
                          labelKey: 'halal.attestation.noGambling.label',
                        },
                      ],
                      groupKey: 'halal.admin.unanswered',
                    },
                  ] as const
                ).map(
                  ({ rows, groupKey }) =>
                    rows.some((r) => r.failed) && (
                      <div key={groupKey} className="mt-1 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-red-700">{t(groupKey)}:</span>
                        <ul className="flex flex-col gap-1">
                          {rows
                            .filter((r) => r.failed)
                            .map((r) => (
                              <li
                                key={r.labelKey}
                                className="flex items-center gap-1.5 text-xs text-red-700"
                              >
                                <Icon
                                  className="h-3.5 w-3.5 flex-shrink-0 text-red-500"
                                  icon="material-symbols:close-small"
                                />
                                {t(r.labelKey)}
                              </li>
                            ))}
                        </ul>
                      </div>
                    ),
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </EditSubPageLayout>
  );
}
