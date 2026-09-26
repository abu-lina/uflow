'use client';

import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

interface LoginGateProps {
  /** Page title shown in the header above the gate. */
  title: string;
  /** Path the user returns to after login, e.g. '/create/basics'. */
  returnPath: string;
}

/** Shared login-required screen for the create submission flows (#415). */
export function LoginGate({ title, returnPath }: LoginGateProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const returnUrl = encodeURIComponent(returnPath);

  return (
    <ScrollablePageLayout>
      <PageHeader title={title} />
      <PageContent
        className={cn(
          'flex min-h-[60vh] items-center justify-center',
          'sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8',
        )}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        <div className="flex w-full flex-col">
          <TitleSection className="mb-10">
            <IconWithTitle
              icon={<Lock className="h-full w-full text-content-heading" />}
              size="large"
              title={t('create.basics.loginRequired')}
            >
              <p className="mt-2 text-center text-base leading-normal text-content">
                {t('create.basics.loginDescription')}
              </p>
            </IconWithTitle>
          </TitleSection>
          <ContentSection>
            <Button
              fullWidth
              type="button"
              variant="auth"
              onClick={() => router.push(`/login?returnUrl=${returnUrl}`)}
            >
              {t('create.basics.goToLogin')}
            </Button>
          </ContentSection>
        </div>
      </PageContent>
    </ScrollablePageLayout>
  );
}
