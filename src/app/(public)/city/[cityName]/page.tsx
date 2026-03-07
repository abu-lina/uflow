import type { Metadata } from 'next';

import { createSupabaseStaticClient } from '@/lib/supabase/static';
import { generateCityCanonicalUrl } from '@/utils/canonicalUrl';
import { CityPageClientEffects } from './CityPageClientEffects';
import { CityStage1Content } from './CityStage1Content';
import { Stage2Content } from '@/components/shared/Stage2Content';
import { CategoryGallerySection } from '@/components/shared/CategoryGallerySection';
import { MobileGreetingHeader } from '@/components/shared/MobileGreetingHeader';

// ISR: regenerate every 5 minutes (ADR-005)
export const revalidate = 300;

type AppStage = 'stage1' | 'stage2' | 'stage3';

interface CityPageProps {
  params: Promise<{ cityName: string }>;
}

function computeStage(providerCount: number): AppStage {
  if (providerCount < 6) return 'stage1';
  if (providerCount < 15) return 'stage2';
  return 'stage3';
}

/**
 * Pre-render all seeded cities at build time.
 * Unknown city slugs are rendered on-demand and cached (dynamicParams = true by default).
 */
export async function generateStaticParams() {
  const supabase = createSupabaseStaticClient();
  const { data } = await supabase.from('cities').select('city_name');
  return (data || []).map((city) => ({ cityName: city.city_name }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { cityName: rawCity } = await params;
  const cityName = decodeURIComponent(rawCity);
  const canonical = generateCityCanonicalUrl(cityName, siteUrl);

  return {
    title: `Services in ${cityName} | Ummah Flow`,
    description: `Discover halal-compliant services and providers in ${cityName}. Ummah Flow connects Muslims with trusted local businesses.`,
    alternates: { canonical },
    openGraph: {
      title: `Services in ${cityName} | Ummah Flow`,
      description: `Discover halal-compliant services and providers in ${cityName}.`,
      url: canonical,
      siteName: 'Ummah Flow',
      type: 'website',
    },
  };
}

/**
 * City Page — Server Component with ISR (Plan 035 — M2)
 *
 * Stage-based content rendering:
 * - Stage 1 (0-5 providers): CityEarlyAccessEmptyState
 * - Stage 2 (6-14 providers): Stage2Content
 * - Stage 3 (15+ providers): CategoryGallerySection with header
 *
 * Data fetched server-side; interactive parts are client islands.
 */
export default async function CityPage({ params }: CityPageProps) {
  const { cityName: rawCity } = await params;
  const cityName = decodeURIComponent(rawCity);

  const supabase = createSupabaseStaticClient();

  // Fetch city from database
  const { data: city } = await supabase
    .from('cities')
    .select('id, city_name, country, is_unlocked')
    .eq('city_name', cityName)
    .maybeSingle();

  // Get live provider count via RPC (case-insensitive match)
  let providerCount = 0;
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_provider_count_by_city', {
    city_name: cityName.trim(),
  });
  if (!rpcError && typeof rpcData === 'number') {
    providerCount = rpcData;
  } else if (rpcError) {
    console.error('[City Page] RPC get_provider_count_by_city failed:', rpcError);
  }

  const displayName = city?.city_name || cityName;
  const country = city?.country;
  const stage = computeStage(providerCount);

  return (
    <>
      {/* Client island: sync selected city to storage + dispatch event */}
      <CityPageClientEffects cityName={displayName} />

      {/* Stage 1: Early Access Empty State (0-5 providers) */}
      {stage === 'stage1' && <CityStage1Content cityName={displayName} country={country} />}

      {/* Stage 2: City Card + Provider List (6-14 providers) */}
      {stage === 'stage2' && <Stage2Content cityName={displayName} />}

      {/* Stage 3: Category Gallery (15+ providers) */}
      {stage === 'stage3' && (
        <div className="flex min-h-screen w-full flex-col bg-uflow-light">
          <header
            className="fixed left-0 right-0 top-0 z-50 sm:hidden"
            style={{
              transition:
                'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.18)',
              isolation: 'isolate',
              marginLeft: '-1px',
              marginRight: '-1px',
              paddingLeft: '1px',
              paddingRight: '1px',
            }}
          >
            <div
              className="px-6 py-4 text-left"
              style={{
                paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 24px))',
              }}
            >
              <div className="max-w-72">
                <MobileGreetingHeader cityName={displayName} />
              </div>
            </div>
          </header>
          <div className="w-full px-6 pt-[max(141px,calc(env(safe-area-inset-top)+141px))]">
            <CategoryGallerySection />
          </div>
        </div>
      )}
    </>
  );
}
