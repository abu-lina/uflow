'use client';

import { useLanguage } from '@/providers/LanguageProvider';

interface HalalTrustBannerProps {
  compact?: boolean;
}

function HalalSealIcon() {
  return (
    <div className="relative h-32 w-32 overflow-hidden rounded-full" data-testid="halal-seal-icon">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_20%,#86c9bf_0%,#66aaa1_48%,#3f8b84_100%)]" />
      <div className="absolute -left-8 top-10 h-20 w-44 rounded-[999px] bg-[#5ea79f]/55 mix-blend-multiply" />
      <div className="absolute left-0 top-12 h-12 w-full rounded-[999px] bg-[#90cfc4]/50 mix-blend-soft-light" />
      <div className="absolute inset-[2px] rounded-full border border-[#4c8e88]/55" />
      <div className="absolute inset-0 flex items-center justify-center" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.35)' }}>
        <span className="font-inter-tight text-[44px] font-semibold leading-none text-[#f2f6f5]" lang="ar">
          حلال
        </span>
      </div>
    </div>
  );
}

export function HalalTrustBanner({ compact = false }: HalalTrustBannerProps) {
  const { t } = useLanguage();

  return (
    <section className={compact ? 'py-2' : 'py-4'}>
      <div className="flex flex-col items-center gap-4 text-center">
        <HalalSealIcon />
        <div className="w-full max-w-[313px]">
          <h3 className="font-inter-tight text-[20px] font-semibold leading-6 text-content-heading">
            {t('providerDetail.halal.title')}
          </h3>
          <p className="mt-2 font-inter text-base leading-6 text-uFlowText2">
            {t('providerDetail.halal.description')}
          </p>
        </div>
      </div>
    </section>
  );
}