'use client';

import { useRouter } from 'next/navigation';
// Material Symbols icon imports removed - using @iconify/react Icon component instead
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { BottomSpacer } from '@/components/layout/BottomSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { LinkButton } from '@/components/ui/LinkButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Icon } from '@/components/ui/Icon';
import { BottomActionNavbar } from '@/components/ui/BottomActionNavbar';

export default function CheckEmailPage() {
  const router = useRouter();

  return (
    <PageLayout hasBackground={false}>
      <PageHeader 
        title="E‑Mail bestätigen"
        variant="back-and-title"
        onBack="/signup"
      />

      <HeaderSpacer />

      <PageContentWrapper centerVertically={true}>
        <div className="flex w-full flex-col">
          <TitleSection className="mb-10">
            <IconWithTitle
              icon={<Icon className="w-full h-full text-content-heading" icon="material-symbols:mail-outline" />}
              size="large"
              title="Überprüfe dein E‑Mail Postfach"
            >
              <p className="text-center text-base leading-normal text-content mt-2">
                Wir haben dir eine Bestätigungs-E‑Mail gesendet. Bitte klicke auf den Link in der E‑Mail, um dein Konto zu aktivieren.
              </p>
            </IconWithTitle>
          </TitleSection>

          <ContentSection>
            <div className="flex flex-col space-y-3">
              {/* Resend Button */}
              <SecondaryButton
                fullWidth
                leadingIcon={<Icon className="w-6 h-6" icon="material-symbols:mark-email-unread" />}
                type="button"
                variant="with-icon"
                onClick={() => {
                  // TODO: Implement resend functionality
                  alert('Resend functionality can be implemented here');
                }}
              >
                E‑Mail erneut senden
              </SecondaryButton>

              {/* Change Email Link */}
              <LinkButton
                onClick={() => router.push('/signup')}
              >
                Andere E‑Mail verwenden
              </LinkButton>
            </div>
          </ContentSection>
        </div>
      </PageContentWrapper>

      <BottomSpacer height="h-16" />

      <BottomActionNavbar
        height="h-16"
        primaryButton={{
          label: 'Nach Bestätigung anmelden',
          icon: <Icon className="h-6 w-6 text-white" icon="material-symbols:chevron-right" />,
          onClick: () => router.push('/login'),
          'aria-label': 'Nach E-Mail Bestätigung zur Anmeldung',
        }}
      />
    </PageLayout>
  );
}
