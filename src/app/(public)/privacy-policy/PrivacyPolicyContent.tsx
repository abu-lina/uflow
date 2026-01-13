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

export function PrivacyPolicyContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  const handleBack = () => {
    router.back();
  };

  // Helper function to render bullet-point lists as semantic HTML
  const renderList = (listText: string) => {
    return listText
      .split('\n')
      .filter((item) => item.trim())
      .map((item, index) => (
        <li key={index} className="text-content leading-6">
          {item.replace(/^•\s*/, '').trim()}
        </li>
      ));
  };

  // Privacy Policy content in all languages
  const content: Record<string, Record<string, string>> = {
    en: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: December 2024',
      intro: 'We take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal data in accordance with the General Data Protection Regulation (GDPR).',
      
      dataController: 'Data Controller',
      dataControllerText: 'Ummah Flow is the data controller responsible for your personal data. For any questions about this Privacy Policy or your data, please contact us at support@ummahflow.com.',
      
      dataCollection: 'Data Collection',
      dataCollectionText: 'We collect the following personal data:',
      dataCollectionList: '• Email address (required for account creation and authentication)\n• Name (provided by you)\n• User-generated content (providers, bookmarks, recommendations)\n• Language preference (to provide localized content)\n• IP address and user agent (for security and audit purposes)',
      
      legalBasis: 'Legal Basis for Processing',
      legalBasisText: 'We process your personal data based on:',
      legalBasisList: '• Contract performance: To provide our services and fulfill our terms of service\n• Legitimate interest: To ensure platform security and prevent fraud\n• Consent: For optional features and data processing activities',
      
      dataProcessing: 'How We Process Your Data',
      dataProcessingText: 'Your data is processed to:',
      dataProcessingList: '• Provide and maintain our services\n• Authenticate your account and ensure security\n• Personalize your experience (language, preferences)\n• Send important service notifications\n• Comply with legal obligations',
      
      thirdParty: 'Third-Party Services',
      thirdPartyText: 'We use the following third-party services that may process your data:',
      thirdPartyList: '• Supabase (database and authentication) - EU region\n• Hetzner Cloud (hosting) - Germany/EU\n• Cloudflare (CDN and security) - Global with EU data centers\n• Resend (email service) - EU compliant',
      thirdPartyNote: 'All third-party services are GDPR-compliant and process data within the EU.',
      
      dataLocation: 'Data Location',
      dataLocationText: 'Your personal data is stored and processed within the European Union (EU):',
      dataLocationList: '• Application servers: Hetzner Cloud, Germany\n• Database: Supabase, EU region\n• CDN: Cloudflare (prioritizes EU data centers)',
      
      userRights: 'Your Rights',
      userRightsText: 'Under GDPR, you have the following rights:',
      userRightsList: '• Right to access: You can request a copy of your personal data\n• Right to rectification: You can correct inaccurate data\n• Right to erasure: You can delete your account and all associated data\n• Right to portability: You can export your data in a machine-readable format\n• Right to object: You can object to certain processing activities',
      userRightsExport: 'To exercise your right to data portability, you can download your data from your profile settings.',
      
      dataRetention: 'Data Retention',
      dataRetentionText: 'We retain your personal data:',
      dataRetentionList: '• While your account is active\n• Until you request deletion\n• For a maximum of 30 days after account deletion (for backup purposes)\n• Consent logs are retained for compliance and audit purposes',
      
      security: 'Security Measures',
      securityText: 'We implement the following security measures to protect your data:',
      securityList: '• Encryption in transit (HTTPS/TLS)\n• Encryption at rest (database encryption)\n• Row Level Security (RLS) policies\n• Regular security audits\n• Access controls and authentication',
      
      cookies: 'Cookies',
      cookiesText: 'We use only essential cookies:',
      cookiesList: '• Authentication cookies (required for login)\n\nWe do not use tracking cookies, analytics cookies, advertising cookies, or preference cookies.',
      
      changes: 'Changes to This Policy',
      changesText: 'We may update this Privacy Policy from time to time. We will notify you of any material changes by email or through our platform. The "Last updated" date at the top indicates when this policy was last revised.',
      
      contact: 'Contact Us',
      contactText: 'If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at support@ummahflow.com.',
    },
    de: {
      title: 'Datenschutzrichtlinie',
      lastUpdated: 'Zuletzt aktualisiert: Dezember 2024',
      intro: 'Wir nehmen Ihren Datenschutz ernst. Diese Datenschutzrichtlinie erklärt, wie wir Ihre persönlichen Daten gemäß der Datenschutz-Grundverordnung (DSGVO) sammeln, verwenden und schützen.',
      
      dataController: 'Verantwortlicher',
      dataControllerText: 'Ummah Flow ist der für Ihre persönlichen Daten verantwortliche Datencontroller. Bei Fragen zu dieser Datenschutzrichtlinie oder Ihren Daten kontaktieren Sie uns bitte unter support@ummahflow.com.',
      
      dataCollection: 'Datenerhebung',
      dataCollectionText: 'Wir erheben folgende persönliche Daten:',
      dataCollectionList: '• E-Mail-Adresse (erforderlich für Kontoerstellung und Authentifizierung)\n• Name (von Ihnen bereitgestellt)\n• Von Benutzern erstellte Inhalte (Anbieter, Lesezeichen, Empfehlungen)\n• Sprachpräferenz (zur Bereitstellung lokalisierter Inhalte)\n• IP-Adresse und User-Agent (zu Sicherheits- und Prüfzwecken)',
      
      legalBasis: 'Rechtsgrundlage für die Verarbeitung',
      legalBasisText: 'Wir verarbeiten Ihre persönlichen Daten auf Grundlage von:',
      legalBasisList: '• Vertragserfüllung: Zur Bereitstellung unserer Dienste und Erfüllung unserer Geschäftsbedingungen\n• Berechtigtes Interesse: Zur Gewährleistung der Plattformsicherheit und Betrugsprävention\n• Einwilligung: Für optionale Funktionen und Datenverarbeitungsaktivitäten',
      
      dataProcessing: 'Wie wir Ihre Daten verarbeiten',
      dataProcessingText: 'Ihre Daten werden verarbeitet, um:',
      dataProcessingList: '• Unsere Dienste bereitzustellen und zu warten\n• Ihr Konto zu authentifizieren und Sicherheit zu gewährleisten\n• Ihre Erfahrung zu personalisieren (Sprache, Präferenzen)\n• Wichtige Service-Benachrichtigungen zu senden\n• Rechtlichen Verpflichtungen nachzukommen',
      
      thirdParty: 'Drittanbieter-Dienste',
      thirdPartyText: 'Wir verwenden folgende Drittanbieter-Dienste, die Ihre Daten verarbeiten können:',
      thirdPartyList: '• Supabase (Datenbank und Authentifizierung) - EU-Region\n• Hetzner Cloud (Hosting) - Deutschland/EU\n• Cloudflare (CDN und Sicherheit) - Global mit EU-Rechenzentren\n• Resend (E-Mail-Service) - DSGVO-konform',
      thirdPartyNote: 'Alle Drittanbieter-Dienste sind DSGVO-konform und verarbeiten Daten innerhalb der EU.',
      
      dataLocation: 'Datenstandort',
      dataLocationText: 'Ihre persönlichen Daten werden innerhalb der Europäischen Union (EU) gespeichert und verarbeitet:',
      dataLocationList: '• Anwendungsserver: Hetzner Cloud, Deutschland\n• Datenbank: Supabase, EU-Region\n• CDN: Cloudflare (priorisiert EU-Rechenzentren)',
      
      userRights: 'Ihre Rechte',
      userRightsText: 'Unter der DSGVO haben Sie folgende Rechte:',
      userRightsList: '• Recht auf Auskunft: Sie können eine Kopie Ihrer persönlichen Daten anfordern\n• Recht auf Berichtigung: Sie können ungenaue Daten korrigieren\n• Recht auf Löschung: Sie können Ihr Konto und alle zugehörigen Daten löschen\n• Recht auf Datenübertragbarkeit: Sie können Ihre Daten in einem maschinenlesbaren Format exportieren\n• Widerspruchsrecht: Sie können bestimmten Verarbeitungsaktivitäten widersprechen',
      userRightsExport: 'Um Ihr Recht auf Datenübertragbarkeit auszuüben, können Sie Ihre Daten in den Profileinstellungen herunterladen.',
      
      dataRetention: 'Datenspeicherung',
      dataRetentionText: 'Wir speichern Ihre persönlichen Daten:',
      dataRetentionList: '• Solange Ihr Konto aktiv ist\n• Bis Sie die Löschung anfordern\n• Maximal 30 Tage nach Kontolöschung (zu Backup-Zwecken)\n• Einwilligungsprotokolle werden zu Compliance- und Prüfzwecken aufbewahrt',
      
      security: 'Sicherheitsmaßnahmen',
      securityText: 'Wir implementieren folgende Sicherheitsmaßnahmen zum Schutz Ihrer Daten:',
      securityList: '• Verschlüsselung während der Übertragung (HTTPS/TLS)\n• Verschlüsselung im Ruhezustand (Datenbankverschlüsselung)\n• Row Level Security (RLS) Richtlinien\n• Regelmäßige Sicherheitsaudits\n• Zugriffskontrollen und Authentifizierung',
      
      cookies: 'Cookies',
      cookiesText: 'Wir verwenden nur essentielle Cookies:',
      cookiesList: '• Authentifizierungs-Cookies (erforderlich für die Anmeldung)\n\nWir verwenden keine Tracking-Cookies, Analyse-Cookies, Werbe-Cookies oder Präferenz-Cookies.',
      
      changes: 'Änderungen an dieser Richtlinie',
      changesText: 'Wir können diese Datenschutzrichtlinie von Zeit zu Zeit aktualisieren. Wir werden Sie über wesentliche Änderungen per E-Mail oder über unsere Plattform informieren. Das Datum "Zuletzt aktualisiert" oben zeigt an, wann diese Richtlinie zuletzt überarbeitet wurde.',
      
      contact: 'Kontaktieren Sie uns',
      contactText: 'Wenn Sie Fragen zu dieser Datenschutzrichtlinie haben oder Ihre Rechte ausüben möchten, kontaktieren Sie uns bitte unter support@ummahflow.com.',
    },
    ar: {
      title: 'سياسة الخصوصية',
      lastUpdated: 'آخر تحديث: ديسمبر 2024',
      intro: 'نحن نأخذ خصوصيتك على محمل الجد. توضح سياسة الخصوصية هذه كيفية جمع واستخدام وحماية بياناتك الشخصية وفقًا للائحة العامة لحماية البيانات (GDPR).',
      
      dataController: 'مسؤول البيانات',
      dataControllerText: 'Ummah Flow هو مسؤول البيانات المسؤول عن بياناتك الشخصية. لأي أسئلة حول سياسة الخصوصية هذه أو بياناتك، يرجى الاتصال بنا على support@ummahflow.com.',
      
      dataCollection: 'جمع البيانات',
      dataCollectionText: 'نجمع البيانات الشخصية التالية:',
      dataCollectionList: '• عنوان البريد الإلكتروني (مطلوب لإنشاء الحساب والمصادقة)\n• الاسم (مقدم منك)\n• المحتوى الذي ينشئه المستخدم (مقدمي الخدمات، الإشارات المرجعية، التوصيات)\n• تفضيل اللغة (لتوفير محتوى محلي)\n• عنوان IP ووكيل المستخدم (لأغراض الأمان والتدقيق)',
      
      legalBasis: 'الأساس القانوني للمعالجة',
      legalBasisText: 'نقوم بمعالجة بياناتك الشخصية على أساس:',
      legalBasisList: '• تنفيذ العقد: لتقديم خدماتنا والوفاء بشروط الخدمة\n• المصلحة المشروعة: لضمان أمان المنصة ومنع الاحتيال\n• الموافقة: للميزات الاختيارية وأنشطة معالجة البيانات',
      
      dataProcessing: 'كيف نعالج بياناتك',
      dataProcessingText: 'يتم معالجة بياناتك من أجل:',
      dataProcessingList: '• تقديم وصيانة خدماتنا\n• المصادقة على حسابك وضمان الأمان\n• تخصيص تجربتك (اللغة، التفضيلات)\n• إرسال إشعارات الخدمة المهمة\n• الامتثال للالتزامات القانونية',
      
      thirdParty: 'خدمات الطرف الثالث',
      thirdPartyText: 'نستخدم خدمات الطرف الثالث التالية التي قد تعالج بياناتك:',
      thirdPartyList: '• Supabase (قاعدة البيانات والمصادقة) - منطقة الاتحاد الأوروبي\n• Hetzner Cloud (الاستضافة) - ألمانيا/الاتحاد الأوروبي\n• Cloudflare (CDN والأمان) - عالمي مع مراكز بيانات الاتحاد الأوروبي\n• Resend (خدمة البريد الإلكتروني) - متوافق مع GDPR',
      thirdPartyNote: 'جميع خدمات الطرف الثالث متوافقة مع GDPR وتعالج البيانات داخل الاتحاد الأوروبي.',
      
      dataLocation: 'موقع البيانات',
      dataLocationText: 'يتم تخزين ومعالجة بياناتك الشخصية داخل الاتحاد الأوروبي (EU):',
      dataLocationList: '• خوادم التطبيق: Hetzner Cloud، ألمانيا\n• قاعدة البيانات: Supabase، منطقة الاتحاد الأوروبي\n• CDN: Cloudflare (يُفضل مراكز بيانات الاتحاد الأوروبي)',
      
      userRights: 'حقوقك',
      userRightsText: 'بموجب GDPR، لديك الحقوق التالية:',
      userRightsList: '• حق الوصول: يمكنك طلب نسخة من بياناتك الشخصية\n• حق التصحيح: يمكنك تصحيح البيانات غير الدقيقة\n• حق الحذف: يمكنك حذف حسابك وجميع البيانات المرتبطة\n• حق قابلية النقل: يمكنك تصدير بياناتك بتنسيق قابل للقراءة آليًا\n• حق الاعتراض: يمكنك الاعتراض على أنشطة معالجة معينة',
      userRightsExport: 'لممارسة حقك في قابلية نقل البيانات، يمكنك تنزيل بياناتك من إعدادات الملف الشخصي.',
      
      dataRetention: 'الاحتفاظ بالبيانات',
      dataRetentionText: 'نحتفظ ببياناتك الشخصية:',
      dataRetentionList: '• بينما حسابك نشط\n• حتى تطلب الحذف\n• لمدة أقصاها 30 يومًا بعد حذف الحساب (لأغراض النسخ الاحتياطي)\n• يتم الاحتفاظ بسجلات الموافقة لأغراض الامتثال والتدقيق',
      
      security: 'تدابير الأمان',
      securityText: 'ننفذ تدابير الأمان التالية لحماية بياناتك:',
      securityList: '• التشفير أثناء النقل (HTTPS/TLS)\n• التشفير في حالة السكون (تشفير قاعدة البيانات)\n• سياسات أمان مستوى الصف (RLS)\n• عمليات تدقيق الأمان المنتظمة\n• ضوابط الوصول والمصادقة',
      
      cookies: 'ملفات تعريف الارتباط',
      cookiesText: 'نستخدم ملفات تعريف الارتباط الأساسية فقط:',
      cookiesList: '• ملفات تعريف الارتباط للمصادقة (مطلوبة لتسجيل الدخول)\n\nلا نستخدم ملفات تعريف الارتباط للتتبع أو التحليلات أو الإعلانات أو التفضيلات.',
      
      changes: 'التغييرات على هذه السياسة',
      changesText: 'قد نحدث سياسة الخصوصية هذه من وقت لآخر. سنخطرك بأي تغييرات جوهرية عبر البريد الإلكتروني أو من خلال منصتنا. يشير تاريخ "آخر تحديث" في الأعلى إلى آخر مراجعة لهذه السياسة.',
      
      contact: 'اتصل بنا',
      contactText: 'إذا كان لديك أسئلة حول سياسة الخصوصية هذه أو ترغب في ممارسة حقوقك، يرجى الاتصال بنا على support@ummahflow.com.',
    },
    tr: {
      title: 'Gizlilik Politikası',
      lastUpdated: 'Son güncelleme: Aralık 2024',
      intro: 'Gizliliğinizi ciddiye alıyoruz. Bu Gizlilik Politikası, Genel Veri Koruma Yönetmeliği (GDPR) uyarınca kişisel verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.',
      
      dataController: 'Veri Sorumlusu',
      dataControllerText: 'Ummah Flow, kişisel verilerinizden sorumlu veri sorumlusudur. Bu Gizlilik Politikası veya verileriniz hakkında sorularınız için lütfen support@ummahflow.com adresinden bizimle iletişime geçin.',
      
      dataCollection: 'Veri Toplama',
      dataCollectionText: 'Aşağıdaki kişisel verileri topluyoruz:',
      dataCollectionList: '• E-posta adresi (hesap oluşturma ve kimlik doğrulama için gerekli)\n• İsim (sizin tarafınızdan sağlanan)\n• Kullanıcı tarafından oluşturulan içerik (sağlayıcılar, yer imleri, öneriler)\n• Dil tercihi (yerelleştirilmiş içerik sağlamak için)\n• IP adresi ve kullanıcı aracısı (güvenlik ve denetim amaçları için)',
      
      legalBasis: 'İşleme Hukuki Dayanağı',
      legalBasisText: 'Kişisel verilerinizi şu temellere dayanarak işliyoruz:',
      legalBasisList: '• Sözleşme performansı: Hizmetlerimizi sağlamak ve hizmet şartlarımızı yerine getirmek için\n• Meşru menfaat: Platform güvenliğini sağlamak ve dolandırıcılığı önlemek için\n• Onay: İsteğe bağlı özellikler ve veri işleme faaliyetleri için',
      
      dataProcessing: 'Verilerinizi Nasıl İşliyoruz',
      dataProcessingText: 'Verileriniz şu amaçlarla işlenir:',
      dataProcessingList: '• Hizmetlerimizi sağlamak ve sürdürmek\n• Hesabınızı doğrulamak ve güvenliği sağlamak\n• Deneyiminizi kişiselleştirmek (dil, tercihler)\n• Önemli hizmet bildirimleri göndermek\n• Yasal yükümlülüklere uymak',
      
      thirdParty: 'Üçüncü Taraf Hizmetleri',
      thirdPartyText: 'Verilerinizi işleyebilecek aşağıdaki üçüncü taraf hizmetleri kullanıyoruz:',
      thirdPartyList: '• Supabase (veritabanı ve kimlik doğrulama) - AB bölgesi\n• Hetzner Cloud (barındırma) - Almanya/AB\n• Cloudflare (CDN ve güvenlik) - AB veri merkezleriyle küresel\n• Resend (e-posta hizmeti) - GDPR uyumlu',
      thirdPartyNote: 'Tüm üçüncü taraf hizmetleri GDPR uyumludur ve verileri AB içinde işler.',
      
      dataLocation: 'Veri Konumu',
      dataLocationText: 'Kişisel verileriniz Avrupa Birliği (AB) içinde saklanır ve işlenir:',
      dataLocationList: '• Uygulama sunucuları: Hetzner Cloud, Almanya\n• Veritabanı: Supabase, AB bölgesi\n• CDN: Cloudflare (AB veri merkezlerini önceliklendirir)',
      
      userRights: 'Haklarınız',
      userRightsText: 'GDPR kapsamında aşağıdaki haklara sahipsiniz:',
      userRightsList: '• Erişim hakkı: Kişisel verilerinizin bir kopyasını talep edebilirsiniz\n• Düzeltme hakkı: Yanlış verileri düzeltebilirsiniz\n• Silme hakkı: Hesabınızı ve tüm ilişkili verileri silebilirsiniz\n• Taşınabilirlik hakkı: Verilerinizi makine tarafından okunabilir bir formatta dışa aktarabilirsiniz\n• İtiraz hakkı: Belirli işleme faaliyetlerine itiraz edebilirsiniz',
      userRightsExport: 'Veri taşınabilirliği hakkınızı kullanmak için, verilerinizi profil ayarlarınızdan indirebilirsiniz.',
      
      dataRetention: 'Veri Saklama',
      dataRetentionText: 'Kişisel verilerinizi şu şekilde saklıyoruz:',
      dataRetentionList: '• Hesabınız aktifken\n• Silme talep edene kadar\n• Hesap silme işleminden sonra en fazla 30 gün (yedekleme amaçları için)\n• Onay kayıtları uyumluluk ve denetim amaçları için saklanır',
      
      security: 'Güvenlik Önlemleri',
      securityText: 'Verilerinizi korumak için aşağıdaki güvenlik önlemlerini uyguluyoruz:',
      securityList: '• Aktarım sırasında şifreleme (HTTPS/TLS)\n• Beklemede şifreleme (veritabanı şifreleme)\n• Satır Düzeyi Güvenlik (RLS) politikaları\n• Düzenli güvenlik denetimleri\n• Erişim kontrolleri ve kimlik doğrulama',
      
      cookies: 'Çerezler',
      cookiesText: 'Yalnızca temel çerezleri kullanıyoruz:',
      cookiesList: '• Kimlik doğrulama çerezleri (giriş için gerekli)\n\nİzleme çerezleri, analitik çerezler, reklam çerezleri veya tercih çerezleri kullanmıyoruz.',
      
      changes: 'Bu Politikadaki Değişiklikler',
      changesText: 'Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler hakkında size e-posta veya platformumuz aracılığıyla bildirimde bulunacağız. Üstteki "Son güncelleme" tarihi, bu politikanın son ne zaman gözden geçirildiğini gösterir.',
      
      contact: 'Bize Ulaşın',
      contactText: 'Bu Gizlilik Politikası hakkında sorularınız varsa veya haklarınızı kullanmak istiyorsanız, lütfen support@ummahflow.com adresinden bizimle iletişime geçin.',
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
            
            <p className="mb-6 text-base text-content leading-6">{langContent.intro}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.dataController}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.dataControllerText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.dataCollection}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.dataCollectionText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.dataCollectionList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.legalBasis}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.legalBasisText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.legalBasisList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.dataProcessing}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.dataProcessingText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.dataProcessingList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.thirdParty}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.thirdPartyText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-4 list-disc list-inside">
              {renderList(langContent.thirdPartyList)}
            </ul>
            <p className="mb-6 text-base text-content-muted italic leading-6">{langContent.thirdPartyNote}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.dataLocation}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.dataLocationText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.dataLocationList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.userRights}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.userRightsText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-4 list-disc list-inside">
              {renderList(langContent.userRightsList)}
            </ul>
            <p className="mb-6 text-base text-content leading-6">{langContent.userRightsExport}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.dataRetention}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.dataRetentionText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.dataRetentionList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.security}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.securityText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.securityList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.cookies}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.cookiesText}</p>
            <div className="bg-neutral-muted p-4 rounded-lg mb-6">
              {(() => {
                const parts = langContent.cookiesList.split('\n\n');
                const listItems = parts[0];
                const additionalText = parts[1];
                return (
                  <>
                    <ul className="space-y-2 text-base text-content list-disc list-inside">
                      {renderList(listItems)}
                    </ul>
                    {additionalText && (
                      <p className="text-base text-content mt-4 leading-6">
                        {additionalText.trim()}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.changes}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.changesText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.contact}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.contactText}</p>
          </div>
        </ContentSection>
      </PageContent>
    </Layout>
  );
}
