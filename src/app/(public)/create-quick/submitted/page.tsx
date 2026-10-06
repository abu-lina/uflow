'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';

// Issue 547 — post-submit landing for quick create. The flow used to push
// straight to /p/<id>, which 404'd because the new row is pending review and
// invisible to the public. This screen confirms the submission instead and
// links to the provider page (which renders for its creator) and to the
// user's submissions.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function SubmittedPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // Only forward a well-formed provider id into the preview link.
  const providerId = searchParams.get('provider');
  const listingHref = providerId && UUID_RE.test(providerId) ? `/p/${providerId}` : null;

  return (
    <PageLayout hasBackground={false} maxWidth="full">
      <PageHeader title={t('submissionStatus.submittedTitle')} variant="title-only" />
      <HeaderSpacer />

      <PageContentWrapper maxWidth="full" padding="lg-safe">
        <div className="flex flex-col gap-8 pb-24 pt-12">
          <IconWithTitle
            icon="mdi:check-decagram-outline"
            iconClassName="h-12 w-12 text-primary"
            size="large"
            title={t('submissionStatus.submittedTitle')}
          >
            <p className="mt-2 text-center text-base leading-normal text-content">
              {t('submissionStatus.submittedBody')}
            </p>
          </IconWithTitle>

          <div className="flex flex-col space-y-3">
            {listingHref && (
              <Button
                fullWidth
                type="button"
                variant="auth"
                onClick={() => router.push(listingHref)}
              >
                {t('submissionStatus.submittedViewListing')}
              </Button>
            )}
            <Button
              fullWidth
              type="button"
              variant={listingHref ? 'secondary' : 'auth'}
              onClick={() => router.push('/profile')}
            >
              {t('submissionStatus.submittedViewProfile')}
            </Button>
          </div>
        </div>
      </PageContentWrapper>
    </PageLayout>
  );
}

export default function CreateQuickSubmittedPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <SubmittedPageContent />
    </Suspense>
  );
}
