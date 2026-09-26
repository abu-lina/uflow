'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FileBadge, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { HalalAttestationFields } from '@/components/shared/HalalAttestationFields';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { validateCertificateFile } from '@/lib/validations/certificate';
import { cn } from '@/lib/utils';

export default function HalalPage() {
  const router = useRouter();
  const { isLoading: isAuthLoading } = useAuth();
  const { formData, updateFormData, isLoading: isFormDataLoading } = useFormData();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = isAuthLoading || isFormDataLoading;

  const STEPS = [
    { title: t('create.steps.basics'), icon: 'lucide:info' },
    { title: t('create.steps.location'), icon: 'lucide:map-pin' },
    { title: t('create.steps.contact'), icon: 'lucide:users' },
    { title: t('createHalal.stepTitle'), icon: 'lucide:badge-check' },
    { title: t('create.steps.media'), icon: 'lucide:images' },
  ];

  if (isLoading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  const handleSave = () => router.push('/create/media');
  const setVer = (m: 'online' | 'onsite') => updateFormData({ verification_method: m });
  const toggleCert = () => {
    const nv = !formData.has_certificate;
    updateFormData({ has_certificate: nv });
    if (!nv) updateFormData({ certificate_file: null, certificate_url: '' });
  };
  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const validation = validateCertificateFile(f);
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
    updateFormData({ certificate_file: f, has_certificate: true });
  };
  const removeCert = () => {
    updateFormData({ certificate_file: null, has_certificate: false, certificate_url: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('createHalal.title')}
        variant="back-and-title"
        onBack="/create/contact"
      />
      <PageContent hasFooter maxWidth="full" paddingX="px-6 sm:px-0">
        <div
          className={cn(
            'flex flex-col gap-6',
            'sm:mx-auto sm:max-w-2xl sm:px-6 md:px-8 lg:max-w-4xl',
          )}
        >
          <div className="mb-6">
            <StepIndicator currentStep={3} steps={STEPS} />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-content-heading">{t('createHalal.title')}</h2>
            <p className="text-sm leading-relaxed text-content-muted">
              {t('createHalal.attestationIntro')}
            </p>
            <HalalAttestationFields
              values={{
                no_alcohol: formData.no_alcohol,
                no_pork: formData.no_pork,
                no_gambling: formData.no_gambling,
              }}
              variant="oath"
              onChange={(field, value) => updateFormData({ [field]: value })}
            />
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-content-heading">
              {t('createHalal.verificationTitle')}
            </h2>
            <p className="text-sm text-content-muted">{t('createHalal.verificationDesc')}</p>
            <div className="flex flex-col gap-3">
              {[
                {
                  value: 'online' as const,
                  label: t('createHalal.methodOnline'),
                  desc: t('createHalal.methodOnlineDesc'),
                },
                {
                  value: 'onsite' as const,
                  label: t('createHalal.methodOnsite'),
                  desc: t('createHalal.methodOnsiteDesc'),
                },
              ].map((opt) => {
                const sel = formData.verification_method === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={`flex w-full items-start gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all ${sel ? 'border-primary bg-primary/5' : 'border-neutral bg-white'}`}
                    type="button"
                    onClick={() => setVer(opt.value)}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${sel ? 'border-primary' : 'border-content-muted'}`}
                    >
                      {sel && <div className="h-3 w-3 rounded-full bg-primary" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-sm font-semibold ${sel ? 'text-primary' : 'text-content-heading'}`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-xs leading-relaxed text-content-muted">{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-lg font-semibold text-content-heading">
                  {t('createHalal.certificateTitle')}
                </h2>
                <p className="text-xs text-content-muted">{t('createHalal.certificateDesc')}</p>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.has_certificate ? 'bg-primary' : 'bg-gray-200'}`}
                type="button"
                onClick={toggleCert}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.has_certificate ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
            {formData.has_certificate && (
              <div className="flex flex-col gap-3">
                {formData.certificate_file ? (
                  <div className="flex w-full items-center justify-between rounded-2xl border border-neutral bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileBadge className="h-icon-md w-icon-md text-primary" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-content-heading">
                          {formData.certificate_file.name}
                        </span>
                        <span className="text-xs text-content-muted">
                          {(formData.certificate_file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                      type="button"
                      onClick={removeCert}
                    >
                      <X className="h-icon-sm w-icon-sm text-content-muted" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      accept="image/*,.pdf"
                      className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      type="file"
                      onChange={handleCertUpload}
                    />
                    <button
                      className="flex h-[54px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral bg-white transition-colors hover:bg-gray-50"
                      type="button"
                    >
                      <Upload className="h-icon-md w-icon-md text-content-muted" />
                      <span className="text-sm font-medium text-content-muted">
                        {t('createHalal.certificateUpload')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageContent>
      <FooterAction
        actionButton={{
          label: t('common.next'),
          trailingIcon: 'lucide:chevron-right',
          // All three attestations require a deliberate answer (yes, no, or
          // "not sure"); undefined means the question was never touched.
          disabled:
            formData.no_alcohol === undefined ||
            formData.no_pork === undefined ||
            formData.no_gambling === undefined,
          onClick: handleSave,
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}
