'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import type { DerivedReviewStatus } from '@/utils/halal-derivation';

interface HalalData {
  noAlcohol: boolean;
  noPork: boolean;
  noGambling: boolean;
  verificationMethod: 'online' | 'onsite' | null;
  hasCertificate: boolean;
  certificateUrl: string | null;
  certificateFile: File | null;
  reviewStatus?: DerivedReviewStatus;
}

function getDerivedTier(data: HalalData): { label: string; color: string } | null {
  if (data.hasCertificate) return { label: 'Gold', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
  if (data.verificationMethod === 'onsite') return { label: 'Silber', color: 'bg-gray-100 text-gray-800 border-gray-400' };
  if (data.verificationMethod === 'online') return { label: 'Bronze', color: 'bg-amber-100 text-amber-800 border-amber-400' };
  return null;
}

const ATTESTATION_ITEMS = [
  { key: 'noAlcohol' as const, label: 'Kein Alkohol', description: 'Wir verarbeiten, verkaufen oder bieten keinen Alkohol an' },
  { key: 'noPork' as const, label: 'Kein verbotenes Fleisch', description: 'Wir verarbeiten, verkaufen oder bieten kein Schweinefleisch oder anderes verbotenes Fleisch an' },
  { key: 'noGambling' as const, label: 'Kein Glücksspiel', description: 'Wir bieten keine Glücksspiele oder Wetten an' },
];

export default function EditHalalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_KEY = `admin_edit_halal_${id}`;

  const [data, setData] = useState<HalalData>({
    noAlcohol: false,
    noPork: false,
    noGambling: false,
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
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HalalData;
        setData({ ...parsed, certificateFile: null });
        return;
      } catch { /* ignore */ }
    }

    fetch(`/api/admin/providers/${id}`)
      .then(res => res.json())
      .then(json => {
        const fp = json.data?.food_providers;
        const sp = json.data?.store_providers;
        const extData = fp || sp;
        if (extData) {
          setData({
            noAlcohol: extData.no_alcohol ?? false,
            noPork: extData.no_pork ?? false,
            noGambling: extData.no_gambling ?? false,
            verificationMethod: extData.verification_method ?? null,
            hasCertificate: extData.has_certificate ?? false,
            certificateUrl: extData.certificate_url ?? null,
            certificateFile: null,
          });
        }
      })
      .catch(() => {});
  }, [STORAGE_KEY, id]);

  const toggleAttestation = (key: 'noAlcohol' | 'noPork' | 'noGambling') => {
    setData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setVerificationMethod = (method: 'online' | 'onsite') => {
    setData(prev => ({ ...prev, verificationMethod: method }));
  };

  const toggleCertificate = () => {
    setData(prev => {
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
    if (file) {
      setData(prev => ({ ...prev, certificateFile: file, hasCertificate: true }));
    }
  };

  const removeCertificate = () => {
    setData(prev => ({ ...prev, certificateFile: null, certificateUrl: null }));
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
          const { data: { publicUrl } } = supabase.storage
            .from('provider-certificates')
            .getPublicUrl(filePath);
          certUrl = publicUrl;
        } else {
          console.error('Certificate upload error:', uploadError);
        }
      } catch (e) {
        console.error('Certificate upload failed:', e);
      }
      setIsUploading(false);
    }

    const reviewStatus = allAttested ? 'approved' : 'rejected';
    const saveData: HalalData = { ...data, certificateUrl: certUrl, certificateFile: null, reviewStatus };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    router.back();
  }, [data, id, STORAGE_KEY, router, allAttested]);

  return (
    <ScrollablePageLayout>
      <PageHeader title="Halal Check" variant="back-and-title" onBack={() => router.back()} />
      <PageContent hasFooter maxWidth="full" paddingX="px-0">
        <div className="flex flex-col px-6 gap-6 pb-mobile-nav-md">

          {/* Section 1: Attestation Questions */}
          <div className="flex flex-col gap-4">
            <button
              className="flex items-center justify-between w-full pl-3 pr-2"
              type="button"
              onClick={() => toggleSection('attestation')}
            >
              <h2 className="text-lg font-medium text-[#232323]">Halal Check</h2>
              <Icon
                className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.attestation ? 'rotate-180' : ''}`}
                icon="material-symbols:expand-more"
              />
            </button>

            {expandedSections.attestation && (
              <div className="space-y-3">
                <p className="text-sm text-[#7A7A7A] leading-relaxed px-3">
                  Bezeugst du bei Allah, dass du die folgenden Dinge NICHT verarbeitest, verkaufst oder anbietest?
                </p>

                <div className="flex flex-col gap-2">
                  {ATTESTATION_ITEMS.map((item) => {
                    const isChecked = data[item.key];
                    return (
                      <button
                        key={item.key}
                        className={`flex items-start gap-4 w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                          isChecked ? 'border-primary bg-primary/5' : 'border-[#E5E5E5] bg-white'
                        }`}
                        type="button"
                        onClick={() => toggleAttestation(item.key)}
                      >
                        <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors ${
                          isChecked ? 'bg-primary border-primary text-white' : 'border-[#999999] bg-white'
                        }`}>
                          {isChecked && <Icon className="w-4 h-4" icon="material-symbols:check" />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-sm font-semibold ${isChecked ? 'text-primary' : 'text-[#272727]'}`}>
                            {item.label}
                          </span>
                          <span className="text-xs text-[#7A7A7A] leading-relaxed">
                            {item.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!allAttested && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" icon="material-symbols:warning-outline" />
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Alle drei Bezeugungsfragen müssen bestätigt sein, bevor der Eintrag freigegeben werden kann.
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
              className="flex items-center justify-between w-full pl-3 pr-2"
              type="button"
              onClick={() => toggleSection('verification')}
            >
              <h2 className="text-lg font-medium text-[#232323]">Verifizierungsmethode</h2>
              <Icon
                className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.verification ? 'rotate-180' : ''}`}
                icon="material-symbols:expand-more"
              />
            </button>

            {expandedSections.verification && (
              <div className="space-y-3">
                <p className="text-sm text-[#7A7A7A] px-3">
                  Wie wurde die Halal-Konformität überprüft?
                </p>

                <div className="flex gap-3">
                  {[
                    { value: 'online' as const, label: 'Online', description: 'Online überprüft (Menü, Website, Selbstauskunft)' },
                    { value: 'onsite' as const, label: 'Vor Ort', description: 'Vor Ort besucht und überprüft' },
                  ].map((option) => {
                    const isSelected = data.verificationMethod === option.value;
                    return (
                      <button
                        key={option.value}
                        className={`flex-1 flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-5 text-center transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-[#E5E5E5] bg-white'
                        }`}
                        type="button"
                        onClick={() => setVerificationMethod(option.value)}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary' : 'border-[#999999]'
                        }`}>
                          {isSelected && <div className="w-3.5 h-3.5 rounded-full bg-primary" />}
                        </div>
                        <span className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-[#272727]'}`}>
                          {option.label}
                        </span>
                        <span className="text-[10px] text-[#7A7A7A] leading-tight text-center">
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
              className="flex items-center justify-between w-full pl-3 pr-2"
              type="button"
              onClick={() => toggleSection('certificate')}
            >
              <h2 className="text-lg font-medium text-[#232323]">Halal-Zertifikat</h2>
              <Icon
                className={`h-6 w-6 text-[#232323] transition-transform ${expandedSections.certificate ? 'rotate-180' : ''}`}
                icon="material-symbols:expand-more"
              />
            </button>

            {expandedSections.certificate && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-3">
                  <p className="text-xs text-[#7A7A7A]">Zertifikat hochladen (optional)</p>
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
                      <div className="flex items-center justify-between w-full rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-6 h-6 text-primary" icon="material-symbols:verified" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#272727]">Vorhandenes Zertifikat</span>
                            <a
                              className="text-xs text-primary underline"
                              href={data.certificateUrl}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              Zertifikat anzeigen
                            </a>
                          </div>
                        </div>
                        <button
                          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
                          type="button"
                          onClick={() => setData(prev => ({ ...prev, certificateUrl: null }))}
                        >
                          <Icon className="w-5 h-5 text-[#999999]" icon="material-symbols:close-rounded" />
                        </button>
                      </div>
                    )}

                    {data.certificateFile ? (
                      <div className="flex items-center justify-between w-full rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-6 h-6 text-primary" icon="mdi:file-document-outline" />
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
                          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100"
                          type="button"
                          onClick={removeCertificate}
                        >
                          <Icon className="w-5 h-5 text-[#999999]" icon="material-symbols:close-rounded" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          accept="image/*,.pdf"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          type="file"
                          onChange={handleCertificateUpload}
                        />
                        <button
                          className="flex w-full h-[54px] items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-white hover:bg-gray-50 transition-colors"
                          type="button"
                        >
                          <Icon className="w-6 h-6 text-[#999999]" icon="lucide:upload" />
                          <span className="text-sm font-medium text-[#999999]">
                            Zertifikat hochladen
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
              <Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" icon="material-symbols:info-outline" />
              <div className="flex flex-col gap-1">
                <p className="text-xs text-blue-700 leading-relaxed">
                  Das Halal-Level wird automatisch aus der Verifizierungsmethode abgeleitet: 
                  Online = Bronze, Vor Ort = Silber, Mit Zertifikat = Gold.
                </p>
                {derivedTier && (
                  <span className={`inline-flex self-start mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${derivedTier.color}`}>
                    Abgeleitetes Level: {derivedTier.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {allAttested ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" icon="material-symbols:check-circle-outline" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-green-800">Auto-Approved</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Alle Bezeugungskriterien erfüllt. Der Eintrag wird vorab genehmigt.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" icon="material-symbols:cancel-outline" />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-red-800">Auto-Rejected</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Nicht alle Kriterien erfüllt. Der Eintrag wird vorab abgelehnt. Du kannst dies auf der Bearbeitungsseite überschreiben.
                  </p>
                  {!allAttested && (
                    <ul className="flex flex-col gap-1 mt-1">
                      {!data.noAlcohol && (
                        <li className="flex items-center gap-1.5 text-xs text-red-700">
                          <Icon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" icon="material-symbols:close-small" />
                          Kein Alkohol
                        </li>
                      )}
                      {!data.noPork && (
                        <li className="flex items-center gap-1.5 text-xs text-red-700">
                          <Icon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" icon="material-symbols:close-small" />
                          Kein verbotenes Fleisch
                        </li>
                      )}
                      {!data.noGambling && (
                        <li className="flex items-center gap-1.5 text-xs text-red-700">
                          <Icon className="w-3.5 h-3.5 text-red-500 flex-shrink-0" icon="material-symbols:close-small" />
                          Kein Glücksspiel
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContent>
      <FooterAction
        primaryButton={{
          label: isUploading ? 'Wird hochgeladen...' : 'Speichern',
          icon: isUploading ? undefined : 'material-symbols:save-outline',
          onClick: handleSave,
          disabled: isUploading,
          loading: isUploading,
        }}
        secondaryButton={{
          icon: 'material-symbols:close',
          onClick: () => router.back(),
          'aria-label': 'Schließen',
        }}
      />
    </ScrollablePageLayout>
  );
}
