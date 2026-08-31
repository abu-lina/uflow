'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function HalalPage() {
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
  const { formData, updateFormData, isLoading: isFormDataLoading } = useFormData();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = isAuthLoading || isFormDataLoading;

  const STEPS = [
    { title: t('create.steps.basics'), icon: 'mdi:information' },
    { title: t('create.steps.location'), icon: 'mdi:map-marker' },
    { title: t('create.steps.contact'), icon: 'mdi:account-group' },
    { title: 'Halal', icon: 'mdi:check-decagram' },
    { title: t('create.steps.media'), icon: 'mdi:image-multiple' },
  ];

  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;
  const isRecommendationMode = formData.creationMode === 'recommendation';

  if (isLoading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  if (isRecommendationMode) {
    router.replace('/create/media');
    return <div className="flex h-screen-fix items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" /></div>;
  }

  const handleSave = () => router.push('/create/media');
  const toggleAtt = (field: 'no_alcohol' | 'no_pork' | 'no_gambling') => updateFormData({ [field]: !formData[field] });
  const setVer = (m: 'online' | 'onsite') => updateFormData({ verification_method: m });
  const toggleCert = () => {
    const nv = !formData.has_certificate;
    updateFormData({ has_certificate: nv });
    if (!nv) updateFormData({ certificate_file: null, certificate_url: '' });
  };
  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) updateFormData({ certificate_file: f, has_certificate: true });
  };
  const removeCert = () => {
    updateFormData({ certificate_file: null, has_certificate: false, certificate_url: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const attItems = [
    { key: 'no_alcohol' as const, label: 'Kein Alkohol', desc: 'Wir verarbeiten, verkaufen oder bieten keinen Alkohol an' },
    { key: 'no_pork' as const, label: 'Kein verbotenes Fleisch', desc: 'Wir verarbeiten, verkaufen oder bieten kein Schweinefleisch oder anderes verbotenes Fleisch an' },
    { key: 'no_gambling' as const, label: 'Kein Glücksspiel', desc: 'Wir bieten keine Glücksspiele oder Wetten an' },
  ];

  return (
    <Layout>
      <PageHeader title="Halal Compliance" variant="back-and-title" onBack="/create/contact" />
      <PageContent hasFooter maxWidth="full" paddingX={isMobile ? 'px-6' : 'px-0'}>
        <div className={cn('flex flex-col gap-6', !isMobile && 'max-w-2xl lg:max-w-4xl mx-auto px-6 md:px-8')}>
          <div className="mb-6"><StepIndicator currentStep={3} steps={STEPS} /></div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-[#232323]">Halal Compliance</h2>
            <p className="text-sm text-[#7A7A7A] leading-relaxed">
              Bezeugst du bei Allah, dass du die folgenden Dinge NICHT verarbeitest, verkaufst oder anbietest?
            </p>
            <div className="flex flex-col gap-3">
              {attItems.map((item) => {
                const ch = formData[item.key];
                return (
                  <button key={item.key} className={`flex items-start gap-4 w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${ch ? 'border-primary bg-primary/5' : 'border-[#E5E5E5] bg-white'}`} type="button" onClick={() => toggleAtt(item.key)}>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 transition-colors ${ch ? 'bg-primary border-primary text-white' : 'border-[#999999] bg-white'}`}>
                      {ch && <Icon className="w-4 h-4" icon="material-symbols:check" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-semibold ${ch ? 'text-primary' : 'text-[#272727]'}`}>{item.label}</span>
                      <span className="text-xs text-[#7A7A7A] leading-relaxed">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-[#232323]">Verifizierungsmethode</h2>
            <p className="text-sm text-[#7A7A7A]">Wie wurde die Halal-Konformität überprüft?</p>
            <div className="flex flex-col gap-3">
              {[
                { value: 'online' as const, label: 'Online', desc: 'Online überprüft (Menü, Website, Selbstauskunft)' },
                { value: 'onsite' as const, label: 'Vor Ort', desc: 'Vor Ort besucht und überprüft' },
              ].map((opt) => {
                const sel = formData.verification_method === opt.value;
                return (
                  <button key={opt.value} className={`flex items-start gap-4 w-full rounded-2xl border-2 px-4 py-4 text-left transition-all ${sel ? 'border-primary bg-primary/5' : 'border-[#E5E5E5] bg-white'}`} type="button" onClick={() => setVer(opt.value)}>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 transition-colors ${sel ? 'border-primary' : 'border-[#999999]'}`}>
                      {sel && <div className="w-3 h-3 rounded-full bg-primary" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-semibold ${sel ? 'text-primary' : 'text-[#272727]'}`}>{opt.label}</span>
                      <span className="text-xs text-[#7A7A7A] leading-relaxed">{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-lg font-semibold text-[#232323]">Halal-Zertifikat</h2>
                <p className="text-xs text-[#7A7A7A]">Lade ein gültiges Halal-Zertifikat hoch (optional)</p>
              </div>
              <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.has_certificate ? 'bg-primary' : 'bg-gray-200'}`} type="button" onClick={toggleCert}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.has_certificate ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {formData.has_certificate && (
              <div className="flex flex-col gap-3">
                {formData.certificate_file ? (
                  <div className="flex items-center justify-between w-full rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-primary" icon="mdi:file-document-outline" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#272727]">{formData.certificate_file.name}</span>
                        <span className="text-xs text-[#7A7A7A]">{(formData.certificate_file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <button className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100" type="button" onClick={removeCert}>
                      <Icon className="w-5 h-5 text-[#999999]" icon="material-symbols:close-rounded" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input ref={fileInputRef} accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" type="file" onChange={handleCertUpload} />
                    <button className="flex w-full h-[54px] items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-white hover:bg-gray-50 transition-colors" type="button">
                      <Icon className="w-6 h-6 text-[#999999]" icon="lucide:upload" />
                      <span className="text-sm font-medium text-[#999999]">Zertifikat hochladen</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" icon="material-symbols:info-outline" />
              <p className="text-xs text-blue-700 leading-relaxed">Das Halal-Level wird automatisch aus der Verifizierungsmethode abgeleitet: Online = Bronze, Vor Ort = Silber, Mit Zertifikat = Gold.</p>
            </div>
          </div>
        </div>
      </PageContent>
      <FooterAction actionButton={{ label: t('common.next'), trailingIcon: 'lucide:chevron-right', onClick: handleSave, variant: 'primary' }} />
    </Layout>
  );
}
