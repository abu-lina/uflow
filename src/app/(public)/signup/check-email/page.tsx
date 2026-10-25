'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { LinkButton } from '@/components/ui/LinkButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Icon } from '@/components/ui/Icon';
import { BottomActionNavbar } from '@/components/ui/BottomActionNavbar';
import { useLanguage } from '@/providers/LanguageProvider';
import { requestAuthEmail } from '@/lib/auth-email-client';
import { readPendingSignupEmail } from '@/lib/signup-session';

type ResendState = 'idle' | 'sending' | 'sent' | 'error';

export default function CheckEmailPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<ResendState>('idle');

  // The signup page stores the just-registered address in sessionStorage so
  // this page can resend the confirmation email without putting it in the URL.
  useEffect(() => {
    setPendingEmail(readPendingSignupEmail());
  }, []);

  const handleResend = async () => {
    if (!pendingEmail || resendState === 'sending') {
      return;
    }

    setResendState('sending');

    try {
      // The server mints the token and mails the link; the browser never sees it (#746)
      const sent = await requestAuthEmail(pendingEmail, 'signup', language);
      setResendState(sent ? 'sent' : 'error');
    } catch (error) {
      console.error('Resend confirmation error:', error);
      setResendState('error');
    }
  };

  return (
    <PageLayout hasBackground={false}>
      <PageContentWrapper centerVertically={true}>
        <div className="flex w-full flex-col">
          <TitleSection className="mb-10">
            <IconWithTitle
              icon={
                <Heart
                  aria-hidden="true"
                  className="h-full w-full text-content-heading"
                  strokeWidth={2.5}
                />
              }
              size="large"
              title={t('signup.checkEmail.successTitle')}
            >
              <p className="mt-2 text-center text-base font-medium leading-normal text-content-heading">
                {t('signup.checkEmail.title')}
              </p>
              <p className="mt-2 text-center text-base leading-normal text-content">
                {t('signup.checkEmail.description')}
              </p>
              <p className="mt-2 text-center text-sm leading-normal text-content-muted">
                {t('signup.checkEmail.spamHint')}
              </p>
            </IconWithTitle>
          </TitleSection>

          <ContentSection>
            <div className="flex flex-col space-y-3">
              {/* Resend Button - only rendered when we know the address to
                  resend to; without it there is no functional control to show */}
              {pendingEmail && (
                <SecondaryButton
                  fullWidth
                  disabled={resendState === 'sending'}
                  leadingIcon={
                    <Icon className="h-6 w-6" icon="material-symbols:mark-email-unread" />
                  }
                  loading={resendState === 'sending'}
                  loadingText={t('signup.checkEmail.resendButtonLoading')}
                  type="button"
                  variant="with-icon"
                  onClick={handleResend}
                >
                  {t('signup.checkEmail.resendButton')}
                </SecondaryButton>
              )}

              {resendState === 'sent' && (
                <p className="text-center text-sm text-content-muted">
                  {t('signup.checkEmail.resendSuccess')}
                </p>
              )}
              {resendState === 'error' && (
                <p className="text-center text-sm text-danger">
                  {t('signup.checkEmail.resendFailed')}
                </p>
              )}

              {/* Change Email Link */}
              <LinkButton onClick={() => router.push('/signup')}>
                {t('signup.checkEmail.useDifferentEmail')}
              </LinkButton>
            </div>
          </ContentSection>
        </div>
      </PageContentWrapper>

      <BottomActionNavbar
        height="h-16"
        primaryButton={{
          label: t('signup.checkEmail.loginButton'),
          icon: <Icon className="h-6 w-6 text-white" icon="material-symbols:chevron-right" />,
          onClick: () => router.push('/login'),
          'aria-label': t('signup.checkEmail.loginAriaLabel'),
        }}
      />
    </PageLayout>
  );
}
