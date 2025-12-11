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

export function TermsOfServiceContent() {
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

  // Terms of Service content in all languages
  const content: Record<string, Record<string, string>> = {
    en: {
      title: 'Terms of Service',
      lastUpdated: 'Last updated: December 2024',
      intro: 'Welcome to Ummah Flow. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully.',
      
      acceptance: 'Acceptance of Terms',
      acceptanceText: 'By creating an account, accessing, or using Ummah Flow, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use our services.',
      
      ageRequirement: 'Age Requirement',
      ageRequirementText: 'You must be at least 16 years old to use Ummah Flow. By using our services, you represent and warrant that you are at least 16 years of age. If you are under 16, you may not use our services.',
      
      account: 'Account Responsibilities',
      accountText: 'When you create an account, you agree to:',
      accountList: '• Provide accurate, current, and complete information\n• Maintain and update your information as necessary\n• Keep your password secure and confidential\n• Notify us immediately of any unauthorized use\n• Be responsible for all activities under your account',
      
      acceptableUse: 'Acceptable Use Policy',
      acceptableUseText: 'You agree to use Ummah Flow only for lawful purposes and in accordance with Islamic values. You agree NOT to:',
      acceptableUseList: '• Post false, misleading, or fraudulent information\n• Violate any applicable laws or regulations\n• Infringe on intellectual property rights\n• Harass, abuse, or harm other users\n• Post content that is haram (prohibited in Islam)\n• Use automated systems to access the platform\n• Interfere with platform security or functionality',
      
      content: 'User Content',
      contentText: 'You retain ownership of content you create and share on Ummah Flow. By posting content, you grant us a license to:',
      contentList: '• Display and distribute your content on the platform\n• Use your content to provide and improve our services\n• Store and backup your content\n\nYou are solely responsible for your content and must ensure it complies with these Terms.',
      
      intellectualProperty: 'Intellectual Property',
      intellectualPropertyText: 'Ummah Flow and its original content, features, and functionality are owned by Ummah Flow and are protected by international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our written permission.',
      
      termination: 'Account Termination',
      terminationText: 'We reserve the right to suspend or terminate your account if you:',
      terminationList: '• Violate these Terms of Service\n• Engage in fraudulent or illegal activity\n• Abuse or harm other users\n• Post prohibited content\n\nYou may also delete your account at any time through your profile settings. Account deletion is permanent and cannot be undone.',
      
      liability: 'Limitation of Liability',
      liabilityText: 'Ummah Flow is provided "as is" without warranties of any kind. We do not guarantee that the platform will be uninterrupted, secure, or error-free. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.',
      
      changes: 'Changes to Terms',
      changesText: 'We may update these Terms of Service from time to time. We will notify you of material changes by email or through our platform. Continued use of our services after changes constitutes acceptance of the new terms. The "Last updated" date indicates when these terms were last revised.',
      
      governingLaw: 'Governing Law',
      governingLawText: 'These Terms of Service are governed by the laws of Germany and the European Union. Any disputes will be resolved in the courts of Germany.',
      
      contact: 'Contact Us',
      contactText: 'If you have questions about these Terms of Service, please contact us at support@ummahflow.com.',
    },
    de: {
      title: 'Allgemeine Geschäftsbedingungen',
      lastUpdated: 'Zuletzt aktualisiert: Dezember 2024',
      intro: 'Willkommen bei Ummah Flow. Durch den Zugriff auf oder die Nutzung unserer Plattform stimmen Sie diesen Allgemeinen Geschäftsbedingungen zu. Bitte lesen Sie sie sorgfältig.',
      
      acceptance: 'Annahme der Bedingungen',
      acceptanceText: 'Durch die Erstellung eines Kontos, den Zugriff auf oder die Nutzung von Ummah Flow bestätigen Sie, dass Sie diese Allgemeinen Geschäftsbedingungen und unsere Datenschutzrichtlinie gelesen, verstanden haben und ihnen zustimmen. Wenn Sie nicht einverstanden sind, nutzen Sie bitte unsere Dienste nicht.',
      
      ageRequirement: 'Altersanforderung',
      ageRequirementText: 'Sie müssen mindestens 16 Jahre alt sein, um Ummah Flow zu nutzen. Durch die Nutzung unserer Dienste erklären und garantieren Sie, dass Sie mindestens 16 Jahre alt sind. Wenn Sie unter 16 sind, dürfen Sie unsere Dienste nicht nutzen.',
      
      account: 'Kontoverantwortlichkeiten',
      accountText: 'Wenn Sie ein Konto erstellen, stimmen Sie zu:',
      accountList: '• Genaue, aktuelle und vollständige Informationen bereitzustellen\n• Ihre Informationen bei Bedarf zu aktualisieren\n• Ihr Passwort sicher und vertraulich zu halten\n• Uns sofort über unbefugte Nutzung zu benachrichtigen\n• Für alle Aktivitäten unter Ihrem Konto verantwortlich zu sein',
      
      acceptableUse: 'Nutzungsrichtlinie',
      acceptableUseText: 'Sie stimmen zu, Ummah Flow nur für rechtmäßige Zwecke und im Einklang mit islamischen Werten zu nutzen. Sie stimmen zu, NICHT:',
      acceptableUseList: '• Falsche, irreführende oder betrügerische Informationen zu veröffentlichen\n• Geltende Gesetze oder Vorschriften zu verletzen\n• Geistige Eigentumsrechte zu verletzen\n• Andere Benutzer zu belästigen, zu missbrauchen oder zu schädigen\n• Inhalte zu veröffentlichen, die haram sind (im Islam verboten)\n• Automatisierte Systeme zur Nutzung der Plattform zu verwenden\n• Die Plattformsicherheit oder Funktionalität zu beeinträchtigen',
      
      content: 'Benutzerinhalte',
      contentText: 'Sie behalten das Eigentum an Inhalten, die Sie auf Ummah Flow erstellen und teilen. Durch das Veröffentlichen von Inhalten gewähren Sie uns eine Lizenz zum:',
      contentList: '• Anzeigen und Verteilen Ihrer Inhalte auf der Plattform\n• Verwenden Ihrer Inhalte zur Bereitstellung und Verbesserung unserer Dienste\n• Speichern und Sichern Ihrer Inhalte\n\nSie sind allein verantwortlich für Ihre Inhalte und müssen sicherstellen, dass sie diesen Bedingungen entsprechen.',
      
      intellectualProperty: 'Geistiges Eigentum',
      intellectualPropertyText: 'Ummah Flow und seine ursprünglichen Inhalte, Funktionen und Funktionalität gehören Ummah Flow und sind durch internationale Urheberrechts-, Marken- und andere Gesetze zum geistigen Eigentum geschützt. Sie dürfen keine Vervielfältigungen, Verteilungen oder abgeleitete Werke ohne unsere schriftliche Genehmigung erstellen.',
      
      termination: 'Kontokündigung',
      terminationText: 'Wir behalten uns das Recht vor, Ihr Konto zu sperren oder zu kündigen, wenn Sie:',
      terminationList: '• Diese Allgemeinen Geschäftsbedingungen verletzen\n• An betrügerischen oder illegalen Aktivitäten teilnehmen\n• Andere Benutzer missbrauchen oder schädigen\n• Verbotene Inhalte veröffentlichen\n\nSie können Ihr Konto auch jederzeit über Ihre Profileinstellungen löschen. Die Kontolöschung ist dauerhaft und kann nicht rückgängig gemacht werden.',
      
      liability: 'Haftungsbeschränkung',
      liabilityText: 'Ummah Flow wird "wie besehen" ohne Gewährleistungen jeglicher Art bereitgestellt. Wir garantieren nicht, dass die Plattform unterbrechungsfrei, sicher oder fehlerfrei ist. Im gesetzlich zulässigen Umfang haften wir nicht für indirekte, zufällige oder Folgeschäden, die aus Ihrer Nutzung der Plattform entstehen.',
      
      changes: 'Änderungen der Bedingungen',
      changesText: 'Wir können diese Allgemeinen Geschäftsbedingungen von Zeit zu Zeit aktualisieren. Wir werden Sie über wesentliche Änderungen per E-Mail oder über unsere Plattform informieren. Die fortgesetzte Nutzung unserer Dienste nach Änderungen stellt eine Annahme der neuen Bedingungen dar. Das Datum "Zuletzt aktualisiert" zeigt an, wann diese Bedingungen zuletzt überarbeitet wurden.',
      
      governingLaw: 'Geltendes Recht',
      governingLawText: 'Diese Allgemeinen Geschäftsbedingungen unterliegen dem Recht Deutschlands und der Europäischen Union. Streitigkeiten werden vor den Gerichten Deutschlands beigelegt.',
      
      contact: 'Kontaktieren Sie uns',
      contactText: 'Wenn Sie Fragen zu diesen Allgemeinen Geschäftsbedingungen haben, kontaktieren Sie uns bitte unter support@ummahflow.com.',
    },
    ar: {
      title: 'شروط الخدمة',
      lastUpdated: 'آخر تحديث: ديسمبر 2024',
      intro: 'مرحبًا بك في Ummah Flow. من خلال الوصول إلى منصتنا أو استخدامها، فإنك توافق على الالتزام بشروط الخدمة هذه. يرجى قراءتها بعناية.',
      
      acceptance: 'قبول الشروط',
      acceptanceText: 'من خلال إنشاء حساب أو الوصول إلى Ummah Flow أو استخدامه، فإنك تقر بأنك قد قرأت وفهمت وتوافق على الالتزام بشروط الخدمة هذه وسياسة الخصوصية الخاصة بنا. إذا كنت لا توافق، يرجى عدم استخدام خدماتنا.',
      
      ageRequirement: 'متطلبات العمر',
      ageRequirementText: 'يجب أن تكون على الأقل 16 عامًا لاستخدام Ummah Flow. باستخدام خدماتنا، فإنك تمثل وتضمن أنك تبلغ من العمر 16 عامًا على الأقل. إذا كنت تحت 16 عامًا، فلا يجوز لك استخدام خدماتنا.',
      
      account: 'مسؤوليات الحساب',
      accountText: 'عند إنشاء حساب، فإنك توافق على:',
      accountList: '• تقديم معلومات دقيقة وحديثة وكاملة\n• الحفاظ على معلوماتك وتحديثها حسب الحاجة\n• الحفاظ على كلمة المرور الخاصة بك آمنة وسرية\n• إخطارنا فورًا بأي استخدام غير مصرح به\n• أن تكون مسؤولاً عن جميع الأنشطة تحت حسابك',
      
      acceptableUse: 'سياسة الاستخدام المقبول',
      acceptableUseText: 'أنت توافق على استخدام Ummah Flow فقط للأغراض القانونية ووفقًا للقيم الإسلامية. أنت توافق على عدم:',
      acceptableUseList: '• نشر معلومات كاذبة أو مضللة أو احتيالية\n• انتهاك أي قوانين أو لوائح سارية\n• انتهاك حقوق الملكية الفكرية\n• مضايقة أو إساءة أو إيذاء المستخدمين الآخرين\n• نشر محتوى حرام (محظور في الإسلام)\n• استخدام أنظمة آلية للوصول إلى المنصة\n• التدخل في أمان أو وظائف المنصة',
      
      content: 'محتوى المستخدم',
      contentText: 'أنت تحتفظ بملكية المحتوى الذي تنشئه وتشاركه على Ummah Flow. من خلال نشر المحتوى، فإنك تمنحنا ترخيصًا لـ:',
      contentList: '• عرض وتوزيع محتواك على المنصة\n• استخدام محتواك لتقديم وتحسين خدماتنا\n• تخزين ونسخ احتياطي لمحتواك\n\nأنت وحدك مسؤول عن محتواك ويجب أن تتأكد من أنه يتوافق مع هذه الشروط.',
      
      intellectualProperty: 'الملكية الفكرية',
      intellectualPropertyText: 'Ummah Flow ومحتواه الأصلي وميزاته ووظائفه مملوكة لـ Ummah Flow ومحمية بموجب قوانين حقوق النشر والعلامات التجارية والملكية الفكرية الدولية الأخرى. لا يجوز لك إعادة إنتاج أو توزيع أو إنشاء أعمال مشتقة دون إذننا الكتابي.',
      
      termination: 'إنهاء الحساب',
      terminationText: 'نحتفظ بالحق في تعليق أو إنهاء حسابك إذا كنت:',
      terminationList: '• تنتهك شروط الخدمة هذه\n• تشارك في أنشطة احتيالية أو غير قانونية\n• تسيء أو تؤذي المستخدمين الآخرين\n• تنشر محتوى محظور\n\nيمكنك أيضًا حذف حسابك في أي وقت من خلال إعدادات الملف الشخصي. حذف الحساب دائم ولا يمكن التراجع عنه.',
      
      liability: 'تحديد المسؤولية',
      liabilityText: 'يتم توفير Ummah Flow "كما هو" دون ضمانات من أي نوع. لا نضمن أن المنصة ستكون غير منقطعة أو آمنة أو خالية من الأخطاء. إلى أقصى حد يسمح به القانون، نحن لسنا مسؤولين عن أي أضرار غير مباشرة أو عرضية أو تبعية ناتجة عن استخدامك للمنصة.',
      
      changes: 'التغييرات على الشروط',
      changesText: 'قد نحدث شروط الخدمة هذه من وقت لآخر. سنخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني أو من خلال منصتنا. الاستمرار في استخدام خدماتنا بعد التغييرات يشكل قبول الشروط الجديدة. يشير تاريخ "آخر تحديث" إلى آخر مراجعة لهذه الشروط.',
      
      governingLaw: 'القانون الحاكم',
      governingLawText: 'تخضع شروط الخدمة هذه لقوانين ألمانيا والاتحاد الأوروبي. سيتم حل أي نزاعات في محاكم ألمانيا.',
      
      contact: 'اتصل بنا',
      contactText: 'إذا كان لديك أسئلة حول شروط الخدمة هذه، يرجى الاتصال بنا على support@ummahflow.com.',
    },
    tr: {
      title: 'Hizmet Şartları',
      lastUpdated: 'Son güncelleme: Aralık 2024',
      intro: 'Ummah Flow\'a hoş geldiniz. Platformumuza erişerek veya kullanarak bu Hizmet Şartlarına bağlı kalmayı kabul edersiniz. Lütfen dikkatle okuyun.',
      
      acceptance: 'Şartların Kabulü',
      acceptanceText: 'Bir hesap oluşturarak, Ummah Flow\'a erişerek veya kullanarak, bu Hizmet Şartlarını ve Gizlilik Politikamızı okuduğunuzu, anladığınızı ve bunlara bağlı kalmayı kabul ettiğinizi onaylarsınız. Katılmıyorsanız, lütfen hizmetlerimizi kullanmayın.',
      
      ageRequirement: 'Yaş Gereksinimi',
      ageRequirementText: 'Ummah Flow\'u kullanmak için en az 16 yaşında olmalısınız. Hizmetlerimizi kullanarak, en az 16 yaşında olduğunuzu temsil eder ve garanti edersiniz. 16 yaşın altındaysanız, hizmetlerimizi kullanamazsınız.',
      
      account: 'Hesap Sorumlulukları',
      accountText: 'Bir hesap oluşturduğunuzda, şunları kabul edersiniz:',
      accountList: '• Doğru, güncel ve eksiksiz bilgi sağlamak\n• Bilgilerinizi gerektiğinde güncellemek\n• Şifrenizi güvenli ve gizli tutmak\n• Yetkisiz kullanımı derhal bize bildirmek\n• Hesabınız altındaki tüm faaliyetlerden sorumlu olmak',
      
      acceptableUse: 'Kabul Edilebilir Kullanım Politikası',
      acceptableUseText: 'Ummah Flow\'u yalnızca yasal amaçlar için ve İslami değerlere uygun olarak kullanmayı kabul edersiniz. Şunları YAPMAYACAĞINIZI kabul edersiniz:',
      acceptableUseList: '• Yanlış, yanıltıcı veya dolandırıcı bilgiler yayınlamak\n• Geçerli yasaları veya düzenlemeleri ihlal etmek\n• Fikri mülkiyet haklarını ihlal etmek\n• Diğer kullanıcıları taciz etmek, kötüye kullanmak veya zarar vermek\n• Haram (İslam\'da yasak) içerik yayınlamak\n• Platforma erişmek için otomatik sistemler kullanmak\n• Platform güvenliğini veya işlevselliğini bozmak',
      
      content: 'Kullanıcı İçeriği',
      contentText: 'Ummah Flow\'da oluşturduğunuz ve paylaştığınız içeriğin sahipliğini elinizde tutarsınız. İçerik yayınlayarak bize şu lisansı verirsiniz:',
      contentList: '• İçeriğinizi platformda görüntülemek ve dağıtmak\n• İçeriğinizi hizmetlerimizi sağlamak ve iyileştirmek için kullanmak\n• İçeriğinizi depolamak ve yedeklemek\n\nİçeriğinizden yalnızca siz sorumlusunuz ve bunun bu Şartlara uygun olduğundan emin olmalısınız.',
      
      intellectualProperty: 'Fikri Mülkiyet',
      intellectualPropertyText: 'Ummah Flow ve orijinal içeriği, özellikleri ve işlevselliği Ummah Flow\'a aittir ve uluslararası telif hakkı, marka ve diğer fikri mülkiyet yasalarıyla korunmaktadır. Yazılı iznimiz olmadan kopyalama, dağıtma veya türev eserler oluşturmayabilirsiniz.',
      
      termination: 'Hesap Sonlandırma',
      terminationText: 'Şu durumlarda hesabınızı askıya alma veya sonlandırma hakkını saklı tutarız:',
      terminationList: '• Bu Hizmet Şartlarını ihlal etmek\n• Dolandırıcı veya yasadışı faaliyetlere katılmak\n• Diğer kullanıcıları kötüye kullanmak veya zarar vermek\n• Yasak içerik yayınlamak\n\nAyrıca hesabınızı profil ayarlarınızdan istediğiniz zaman silebilirsiniz. Hesap silme kalıcıdır ve geri alınamaz.',
      
      liability: 'Sorumluluk Sınırlaması',
      liabilityText: 'Ummah Flow "olduğu gibi" herhangi bir garanti olmadan sağlanır. Platformun kesintisiz, güvenli veya hatasız olacağını garanti etmiyoruz. Yasanın izin verdiği azami ölçüde, platformu kullanmanızdan kaynaklanan dolaylı, arızi veya sonuçsal zararlardan sorumlu değiliz.',
      
      changes: 'Şartlardaki Değişiklikler',
      changesText: 'Bu Hizmet Şartlarını zaman zaman güncelleyebiliriz. Önemli değişiklikler hakkında size e-posta veya platformumuz aracılığıyla bildirimde bulunacağız. Değişikliklerden sonra hizmetlerimizi kullanmaya devam etmek yeni şartları kabul etmek anlamına gelir. "Son güncelleme" tarihi, bu şartların son ne zaman gözden geçirildiğini gösterir.',
      
      governingLaw: 'Uygulanacak Hukuk',
      governingLawText: 'Bu Hizmet Şartları Almanya ve Avrupa Birliği yasalarına tabidir. Herhangi bir anlaşmazlık Almanya mahkemelerinde çözülecektir.',
      
      contact: 'Bize Ulaşın',
      contactText: 'Bu Hizmet Şartları hakkında sorularınız varsa, lütfen support@ummahflow.com adresinden bizimle iletişime geçin.',
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

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.acceptance}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.acceptanceText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.ageRequirement}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.ageRequirementText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.account}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.accountText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.accountList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.acceptableUse}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.acceptableUseText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.acceptableUseList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.content}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.contentText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.contentList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.intellectualProperty}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.intellectualPropertyText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.termination}</h2>
            <p className="mb-4 text-base text-content leading-6">{langContent.terminationText}</p>
            <ul className="space-y-2 text-base bg-neutral-muted text-content p-4 rounded-lg mb-6 list-disc list-inside">
              {renderList(langContent.terminationList)}
            </ul>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.liability}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.liabilityText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.changes}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.changesText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.governingLaw}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.governingLawText}</p>

            <h2 className="text-lg font-semibold mt-8 mb-4 text-content-heading">{langContent.contact}</h2>
            <p className="mb-6 text-base text-content leading-6">{langContent.contactText}</p>
          </div>
        </ContentSection>
      </PageContent>
    </Layout>
  );
}
