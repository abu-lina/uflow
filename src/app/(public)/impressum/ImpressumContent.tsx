'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { ContentSection } from '@/components/layout/ContentSection';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

export function ImpressumContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

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
      operator: 'TMG Bölüm 5\'e göre bilgiler',
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
    <Layout>
      <PageHeader
        className={cn(
          !isMobile && 'md:top-20 md:z-[100] [&>div]:md:px-0 [&>div]:md:max-w-full'
        )}
        customContent={
          !isMobile ? (
            <div className="w-full max-w-[640px] mx-auto px-6 md:px-8 flex items-center h-header-height-mobile sm:h-header-height-tablet">
              <button
                aria-label="Zurück"
                className="flex items-center justify-center w-8 h-8 -ml-1"
                onClick={handleBack}
              >
                <Icon 
                  className="w-8 h-8 text-content-heading pointer-events-none" 
                  icon="material-symbols:chevron-left" 
                />
              </button>
              <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
                {langContent.title}
              </h1>
            </div>
          ) : undefined
        }
        title={langContent.title}
        variant="back-and-title"
        onBack={isMobile ? handleBack : undefined}
      />

      <PageContent 
        className={cn(
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        maxWidth="full"
        paddingBottom="pb-12"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <ContentSection>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-content-muted mb-6">{langContent.lastUpdated}</p>
            
            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.operator}</h2>
            
            <div className="mb-6 space-y-4">
              <div>
                <p className="font-semibold text-base text-content-heading mb-1">{langContent.name}</p>
                <p className="text-base text-content leading-6">{langContent.nameValue}</p>
              </div>
              
              <div>
                <p className="font-semibold text-base text-content-heading mb-1">{langContent.address}</p>
                <p className="text-base text-content leading-6 whitespace-pre-line">{langContent.addressValue}</p>
              </div>
              
              <div>
                <p className="font-semibold text-base text-content-heading mb-2">{langContent.contact}</p>
                <div className="space-y-2">
                  <p className="text-base text-content leading-6">
                    <span className="font-medium">{langContent.email}:</span>{' '}
                    <a 
                      className="text-primary hover:text-primary-dark underline"
                      href="mailto:support@ummahflow.com"
                    >
                      {langContent.emailValue}
                    </a>
                  </p>
                  <p className="text-base text-content leading-6">
                    <span className="font-medium">{langContent.phone}:</span>{' '}
                    {langContent.phoneValue}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="font-semibold text-base text-content-heading mb-1">{langContent.responsible}</p>
                <p className="text-base text-content leading-6">
                  {langContent.responsibleText}{' '}
                  <span className="font-medium">{langContent.responsibleValue}</span>
                </p>
              </div>
            </div>
          </div>
        </ContentSection>
      </PageContent>
    </Layout>
  );
}
