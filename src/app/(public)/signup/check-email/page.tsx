'use client';

import { useRouter } from 'next/navigation';
// Material Symbols icon imports removed - using @iconify/react Icon component instead
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { AuthFormSection } from '@/components/layout/AuthFormSection';
import { IconWithTitle, LinkButton, SecondaryButton, Icon } from '@/components/ui';

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
          {/* Title + Description with icon */}
          <TitleSection className="mb-10">
            <IconWithTitle
              icon={<Icon className="w-full h-full text-content-title" icon="material-symbols:mail-outline" />}
              size="large"
              title="Überprüfe dein E‑Mail Postfach"
            >
              <p className="text-center text-base leading-normal text-content mt-2">
                Wir haben dir eine Bestätigungs-E‑Mail gesendet. Bitte klicke auf den Link in der E‑Mail, um dein Konto zu aktivieren.
              </p>
            </IconWithTitle>
          </TitleSection>

          {/* Actions */}
          <AuthFormSection>
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
          </AuthFormSection>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}
