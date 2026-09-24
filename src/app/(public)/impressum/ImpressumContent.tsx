'use client';

import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { ContentSection } from '@/components/layout/ContentSection';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export function ImpressumContent() {
  const router = useRouter();
  const { language } = useLanguage();

  const handleBack = () => {
    router.back();
  };

  // Impressum content in all languages
  const content: Record<string, Record<string, string>> = {
    en: {
      title: 'Legal Notice',
      lastUpdated: 'Last updated: December 2024',
      operator: 'Information according to TMG Section 5',
      name: 'Name',
      nameValue: '[PLACEHOLDER_NAME]',
      address: 'Address',
      addressValue: '[PLACEHOLDER_ADDRESS]',
      contact: 'Contact',
      email: 'Email',
      emailValue: 'support@ummahflow.com',
      phone: 'Phone',
      phoneValue: '[PLACEHOLDER_PHONE]',
      responsible: 'Responsible for content',
      responsibleText: 'Responsible for content (§ 55 Abs. 2 RStV):',
      responsibleValue: '[PLACEHOLDER_NAME]',
    },
    de: {
      title: 'Impressum',
      lastUpdated: 'Zuletzt aktualisiert: Dezember 2024',
      operator: 'Angaben gemäß § 5 TMG',
      name: 'Name',
      nameValue: '[PLACEHOLDER_NAME]',
      address: 'Adresse',
      addressValue: '[PLACEHOLDER_ADDRESS]',
      contact: 'Kontakt',
      email: 'E-Mail',
      emailValue: 'support@ummahflow.com',
      phone: 'Telefon',
      phoneValue: '[PLACEHOLDER_PHONE]',
      responsible: 'Verantwortlich für den Inhalt',
      responsibleText: 'Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV):',
      responsibleValue: '[PLACEHOLDER_NAME]',
    },
    ar: {
      title: 'البيانات القانونية',
      lastUpdated: 'آخر تحديث: ديسمبر 2024',
      operator: 'المعلومات وفقًا للمادة 5 من قانون الوسائط الألماني',
      name: 'الاسم',
      nameValue: '[PLACEHOLDER_NAME]',
      address: 'العنوان',
      addressValue: '[PLACEHOLDER_ADDRESS]',
      contact: 'جهة الاتصال',
      email: 'البريد الإلكتروني',
      emailValue: 'support@ummahflow.com',
      phone: 'الهاتف',
      phoneValue: '[PLACEHOLDER_PHONE]',
      responsible: 'مسؤول عن المحتوى',
      responsibleText: 'مسؤول عن المحتوى (§ 55 Abs. 2 RStV):',
      responsibleValue: '[PLACEHOLDER_NAME]',
    },
    tr: {
      title: 'Yasal Bildirim',
      lastUpdated: 'Son güncelleme: Aralık 2024',
      operator: "TMG Bölüm 5'e göre bilgiler",
      name: 'İsim',
      nameValue: '[PLACEHOLDER_NAME]',
      address: 'Adres',
      addressValue: '[PLACEHOLDER_ADDRESS]',
      contact: 'İletişim',
      email: 'E-posta',
      emailValue: 'support@ummahflow.com',
      phone: 'Telefon',
      phoneValue: '[PLACEHOLDER_PHONE]',
      responsible: 'İçerikten sorumlu',
      responsibleText: 'İçerikten sorumlu (§ 55 Abs. 2 RStV):',
      responsibleValue: '[PLACEHOLDER_NAME]',
    },
  };

  const langContent = content[language] || content.en;

  return (
    <ScrollablePageLayout>
      <PageHeader
        className={cn('md:top-20 md:z-[100] [&>div]:md:max-w-full [&>div]:md:px-0')}
        title={langContent.title}
        variant="back-and-title"
        onBack={handleBack}
      />

      <PageContent
        className={cn('sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8')}
        maxWidth="full"
        paddingBottom="pb-12"
        paddingX="px-6 sm:px-0"
      >
        <ContentSection>
          <div className="prose prose-sm max-w-none">
            <p className="mb-6 text-sm text-content-muted">{langContent.lastUpdated}</p>

            <h2 className="mb-4 mt-8 text-lg font-semibold text-content-heading">
              {langContent.operator}
            </h2>

            <div className="mb-6 space-y-4">
              <div>
                <p className="mb-1 text-base font-semibold text-content-heading">
                  {langContent.name}
                </p>
                <p className="text-base leading-6 text-content">{langContent.nameValue}</p>
              </div>

              <div>
                <p className="mb-1 text-base font-semibold text-content-heading">
                  {langContent.address}
                </p>
                <p className="whitespace-pre-line text-base leading-6 text-content">
                  {langContent.addressValue}
                </p>
              </div>

              <div>
                <p className="mb-2 text-base font-semibold text-content-heading">
                  {langContent.contact}
                </p>
                <div className="space-y-2">
                  <p className="text-base leading-6 text-content">
                    <span className="font-medium">{langContent.email}:</span>{' '}
                    <a
                      className="text-primary underline hover:text-primary-dark"
                      href="mailto:support@ummahflow.com"
                    >
                      {langContent.emailValue}
                    </a>
                  </p>
                  <p className="text-base leading-6 text-content">
                    <span className="font-medium">{langContent.phone}:</span>{' '}
                    {langContent.phoneValue}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1 text-base font-semibold text-content-heading">
                  {langContent.responsible}
                </p>
                <p className="text-base leading-6 text-content">
                  {langContent.responsibleText}{' '}
                  <span className="font-medium">{langContent.responsibleValue}</span>
                </p>
              </div>
            </div>
          </div>
        </ContentSection>
      </PageContent>
    </ScrollablePageLayout>
  );
}
