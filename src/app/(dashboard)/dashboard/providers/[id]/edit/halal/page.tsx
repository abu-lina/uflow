'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';

type HalalTier = 'bronze' | 'silver' | 'gold' | null;

interface HalalData {
  verificationMethod: string | null;
  hasCertificate: boolean;
  certificateUrl: string | null;
}

const TIERS = [
  {
    key: 'bronze' as const,
    label: 'Bronze',
    description: 'Online verification',
    icon: 'material-symbols:internet',
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    activeColor: 'bg-amber-100 border-amber-500 text-amber-800',
  },
  {
    key: 'silver' as const,
    label: 'Silver',
    description: 'On-site verification',
    icon: 'material-symbols:store',
    color: 'bg-gray-50 border-gray-200 text-gray-700',
    activeColor: 'bg-gray-100 border-gray-500 text-gray-800',
  },
  {
    key: 'gold' as const,
    label: 'Gold',
    description: 'Certified halal',
    icon: 'material-symbols:verified',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    activeColor: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  },
];

export default function EditHalalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const STORAGE_KEY = `admin_edit_halal_${id}`;

  const [data, setData] = useState<HalalData>({
    verificationMethod: null,
    hasCertificate: false,
    certificateUrl: null,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HalalData;
        setData(parsed);
        return;
      } catch { /* ignore */ }
    }

    fetch(`/api/admin/providers/${id}`)
      .then(res => res.json())
      .then(json => {
        const fp = json.data?.food_providers;
        if (fp) {
          setData({
            verificationMethod: fp.verification_method ?? null,
            hasCertificate: fp.has_certificate ?? false,
            certificateUrl: fp.certificate_url ?? null,
          });
        }
      })
      .catch(() => {});
  }, [STORAGE_KEY, id]);

  const getCurrentTier = useCallback((): HalalTier => {
    if (data.hasCertificate) return 'gold';
    if (data.verificationMethod === 'onsite') return 'silver';
    if (data.verificationMethod === 'online') return 'bronze';
    return null;
  }, [data]);

  const selectTier = (tier: HalalTier) => {
    switch (tier) {
      case 'bronze':
        setData({ verificationMethod: 'online', hasCertificate: false, certificateUrl: null });
        break;
      case 'silver':
        setData({ verificationMethod: 'onsite', hasCertificate: false, certificateUrl: null });
        break;
      case 'gold':
        setData(prev => ({ ...prev, verificationMethod: 'onsite', hasCertificate: true }));
        break;
      default:
        setData({ verificationMethod: null, hasCertificate: false, certificateUrl: null });
    }
  };

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    router.back();
  }, [data, STORAGE_KEY, router]);

  const currentTier = getCurrentTier();

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Halal Check" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-6 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {TIERS.map(tier => {
            const isActive = currentTier === tier.key;
            return (
              <button
                key={tier.key}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 transition-colors ${isActive ? tier.activeColor : tier.color}`}
                type="button"
                onClick={() => selectTier(tier.key)}
              >
                <Icon className="h-8 w-8" icon={tier.icon} />
                <span className="text-sm font-semibold">{tier.label}</span>
                <span className="text-[10px] text-center leading-tight">{tier.description}</span>
              </button>
            );
          })}
        </div>

        {currentTier === 'gold' && (
          <div className="rounded-2xl border border-[#E5E5E5] bg-white px-4 py-3 shadow-sm">
            <label className="text-xs font-normal text-[#999999]">Certificate URL</label>
            <input
              className="mt-1 w-full text-[15px] font-medium text-[#272727] outline-none bg-transparent"
              placeholder="https://..."
              type="url"
              value={data.certificateUrl ?? ''}
              onChange={(e) => setData(prev => ({ ...prev, certificateUrl: e.target.value || null }))}
            />
            {data.certificateUrl && (
              <a
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline"
                href={data.certificateUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icon className="h-4 w-4" icon="material-symbols:open-in-new" />
                View certificate
              </a>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-[#E5E5E5] bg-blue-50 px-4 py-3">
          <p className="text-xs text-blue-700">
            Halal tier information is sourced from your provider profile and Wolt enrichment data.
            Certificate upload will be available in a separate flow.
          </p>
        </div>
      </main>
      <FooterAction
        primaryButton={{
          label: 'Save',
          icon: 'material-symbols:save-outline',
          onClick: handleSave,
        }}
        secondaryButton={{
          icon: 'material-symbols:close',
          onClick: () => router.back(),
          'aria-label': 'Close',
        }}
      />
    </div>
  );
}
