'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';
import type { AdminProviderDeliveryLink } from '@/types/adminProvider';

const PLATFORMS = ['wolt', 'lieferando', 'ubereats', 'website'] as const;

const PLATFORM_LABELS: Record<string, string> = {
  wolt: 'Wolt',
  lieferando: 'Lieferando',
  ubereats: 'Uber Eats',
  website: 'Website / Other',
};

const PLATFORM_ICONS: Record<string, string> = {
  wolt: 'simple-icons:wolt',
  lieferando: 'simple-icons:lieferando',
  ubereats: 'simple-icons:ubereats',
  website: 'material-symbols:language',
};

const DEFAULT_LINK: AdminProviderDeliveryLink = {
  platform: 'website',
  platform_url: '',
  platform_slug: '',
  is_active: true,
};

function PlatformNameDisplay({ platform, platform_slug }: { platform: string; platform_slug?: string | null }) {
  if (platform === 'website' && platform_slug) {
    return <>{platform_slug}</>;
  }
  return <>{PLATFORM_LABELS[platform] ?? platform}</>;
}

export default function EditDeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const STORAGE_KEY = `admin_edit_delivery_${id}`;

  const [links, setLinks] = useState<AdminProviderDeliveryLink[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLink, setNewLink] = useState<AdminProviderDeliveryLink>({ ...DEFAULT_LINK });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLinks(parsed);
          return;
        }
      } catch { /* ignore */ }
    }

    async function fetchLinks() {
      try {
        const res = await fetch(`/api/admin/providers/${id}/delivery-links`);
        if (res.ok) {
          const json = await res.json();
          const data = (json.data ?? []) as AdminProviderDeliveryLink[];
          setLinks(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch { /* ignore */ }
    }
    fetchLinks();
  }, [id, STORAGE_KEY]);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    router.back();
  }, [links, STORAGE_KEY, router]);

  const updateLink = (index: number, field: string, value: unknown) => {
    setLinks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeLink = (index: number) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    if (!newLink.platform_url.trim()) return;
    setLinks(prev => [...prev, { ...newLink }]);
    setNewLink({ ...DEFAULT_LINK });
    setShowAddForm(false);
  };

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Delivery / Order Links" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
              <Icon className="h-6 w-6 text-[#999999]" icon={PLATFORM_ICONS[link.platform] ?? 'material-symbols:link'} />
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <select
                  className="text-xs font-medium text-[#999999] outline-none bg-transparent"
                  value={link.platform}
                  onChange={(e) => updateLink(i, 'platform', e.target.value)}
                >
                  {PLATFORMS.map(p => (
                    <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                  ))}
                </select>

                {/* Custom name input for website links */}
                {link.platform === 'website' && (
                  <input
                    className="text-[13px] font-medium text-[#272727] outline-none bg-transparent"
                    placeholder="e.g. Online-Shop, Bestellseite"
                    type="text"
                    value={link.platform_slug ?? ''}
                    onChange={(e) => updateLink(i, 'platform_slug', e.target.value)}
                  />
                )}

                <input
                  className="text-[13px] font-medium text-[#272727] outline-none bg-transparent truncate"
                  placeholder="https://..."
                  type="url"
                  value={link.platform_url}
                  onChange={(e) => updateLink(i, 'platform_url', e.target.value)}
                />
              </div>
              <label className="flex items-center gap-1 text-xs text-[#999999]">
                <input
                  type="checkbox"
                  checked={link.is_active}
                  onChange={(e) => updateLink(i, 'is_active', e.target.checked)}
                />
                Active
              </label>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50"
                type="button"
                onClick={() => removeLink(i)}
              >
                <Icon className="h-5 w-5 text-red-400" icon="material-symbols:close-rounded" />
              </button>
            </div>
          ))}
        </div>

        {showAddForm ? (
          <div className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm gap-2">
            <select
              className="text-xs font-medium text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
              value={newLink.platform}
              onChange={(e) => setNewLink(prev => ({ ...prev, platform: e.target.value as AdminProviderDeliveryLink['platform'] }))}
            >
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
              ))}
            </select>

            {/* Custom name input for new website links */}
            {newLink.platform === 'website' && (
              <input
                className="text-[13px] font-medium text-[#272727] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                placeholder="Name, e.g. Online-Shop"
                type="text"
                value={newLink.platform_slug ?? ''}
                onChange={(e) => setNewLink(prev => ({ ...prev, platform_slug: e.target.value }))}
              />
            )}

            <input
              className="text-[13px] font-medium text-[#272727] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
              placeholder="URL *"
              type="url"
              value={newLink.platform_url}
              onChange={(e) => setNewLink(prev => ({ ...prev, platform_url: e.target.value }))}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                disabled={!newLink.platform_url.trim()}
                type="button"
                onClick={addLink}
              >
                Add
              </button>
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#999999] hover:bg-gray-50"
                type="button"
                onClick={() => { setShowAddForm(false); setNewLink({ ...DEFAULT_LINK }); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-3 py-3 shadow-sm hover:bg-gray-50"
            type="button"
            onClick={() => setShowAddForm(true)}
          >
            <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:add" />
            <span className="text-sm font-medium text-[#999999]">Add link</span>
          </button>
        )}
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
