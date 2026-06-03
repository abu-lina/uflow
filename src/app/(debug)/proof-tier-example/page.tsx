import { HalalTrustBanner } from '@/features/providers/components/HalalTrustBanner';
import { ProofTierCard } from '@/features/providers/components/ProofTierCard';

const EXAMPLES: Array<{
  label: string;
  verificationMethod: 'online' | 'onsite' | null;
  hasCertificate: boolean;
}> = [
  { label: 'Level 1: Online', verificationMethod: null, hasCertificate: false },
  { label: 'Level 2: Online + Certificate', verificationMethod: 'online', hasCertificate: true },
  { label: 'Level 3: On-site', verificationMethod: 'onsite', hasCertificate: false },
  { label: 'Level 4: On-site + Certificate', verificationMethod: 'onsite', hasCertificate: true },
];

export default function ProofTierExamplePage() {
  return (
    <main className="min-h-screen bg-[#f4f7f6] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="font-inter-tight text-3xl font-semibold text-content-heading">
            Plan 133 DEV Example: Baseline + Halal Check
          </h1>
          <p className="max-w-3xl text-base text-content">
            This page demonstrates the updated model: baseline halal trust appears first, and
            verification depth is shown separately through proof tiers.
          </p>
        </header>

        <section className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-content">
            Step 1: Baseline Gate
          </p>
          <HalalTrustBanner />
        </section>

        <section className="rounded-2xl border border-border/50 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-content">
            Step 2: Halal Check Transparency
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {EXAMPLES.map((example) => (
              <div
                key={example.label}
                className="space-y-2 rounded-xl border border-border/40 bg-[#fbfdfc] p-4"
              >
                <p className="text-sm font-medium text-content-heading">{example.label}</p>
                <ProofTierCard
                  hasCertificate={example.hasCertificate}
                  verificationMethod={example.verificationMethod}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
