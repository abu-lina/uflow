'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/providers/LanguageProvider';
import type { CommunityService } from '@/services/communityServices';

interface AdminCommunityServiceEditPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminCommunityServiceEditPage({ params }: AdminCommunityServiceEditPageProps) {
  const { id: communityServiceId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [communityService, setCommunityService] = useState<CommunityService | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');

  useEffect(() => {
    async function loadCommunityService() {
      try {
        const response = await fetch(`/api/admin/community-services/${communityServiceId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Community service not found');
          } else if (response.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to load community service');
          }
          return;
        }
        const data = await response.json();
        const cs = data.data || data;
        setCommunityService(cs);

        // Populate form
        setName(cs.community_service_name || '');
        setDescription(cs.community_service_description || '');
        setStreet(cs.address_street || '');
        setZip(cs.address_zip || '');
        setCity(cs.address_city || '');
        setCountry(cs.address_country || '');
        setEmail(cs.contact_email || '');
        setPhone(cs.contact_phone || '');
        setWebsite(cs.social_website || '');
        setInstagram(cs.social_instagram || '');
      } catch {
        setError('Failed to load community service');
      } finally {
        setLoading(false);
      }
    }

    loadCommunityService();
  }, [communityServiceId]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/edit-community-service', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityServiceId,
          communityServiceName: name.trim(),
          communityServiceDescription: description.trim() || null,
          addressStreet: street.trim() || null,
          addressZip: zip.trim() || null,
          addressCity: city.trim() || null,
          addressCountry: country.trim() || null,
          contactEmail: email.trim() || null,
          contactPhone: phone.trim() || null,
          socialWebsite: website.trim() || null,
          socialInstagram: instagram.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to save');
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-service', communityServiceId] }),
        queryClient.invalidateQueries({ queryKey: ['community-services'] }),
      ]);

      toast.success('Community service updated');
      router.push(`/community-services/${communityServiceId}`);
    } catch {
      toast.error('Failed to save community service');
    } finally {
      setSaving(false);
    }
  }, [communityServiceId, name, description, street, zip, city, country, email, phone, website, instagram, queryClient, router]);

  const handleBack = () => {
    router.push(`/community-services/${communityServiceId}`);
  };

  const handleReview = useCallback(
    async (reviewStatus: 'approved' | 'rejected' | 'needs_revision', feedback?: string) => {
      setReviewing(true);
      try {
        const response = await fetch('/api/admin/review-community-service', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            communityServiceId,
            reviewStatus,
            reviewFeedback: feedback ?? null,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({})) as { error?: string };
          toast.error(errorData.error || 'Review action failed');
          return;
        }

        const responseData = await response.json() as { data?: { review_status?: string } };
        setCommunityService((prev) =>
          prev
            ? { ...prev, review_status: responseData.data?.review_status as CommunityService['review_status'] }
            : prev
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['community-service', communityServiceId] }),
          queryClient.invalidateQueries({ queryKey: ['community-services'] }),
        ]);

        toast.success(
          reviewStatus === 'approved'
            ? 'Community service approved'
            : reviewStatus === 'rejected'
            ? 'Community service rejected'
            : 'Revision requested'
        );
        setShowRejectModal(false);
        setRejectFeedback('');
      } catch {
        toast.error('Review action failed');
      } finally {
        setReviewing(false);
      }
    },
    [communityServiceId, queryClient]
  );

  if (loading) {
    return (
      <div className="flex h-screen-fix flex-col">
        <PageHeader
          title={t('editProvider.title')}
          variant="back-and-title"
          onBack={handleBack}
        />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
      </div>
    );
  }

  if (error || !communityService) {
    return (
      <div className="flex h-screen-fix flex-col">
        <PageHeader
          title={t('editProvider.title')}
          variant="back-and-title"
          onBack={handleBack}
        />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
          <p className="text-center text-gray-500">{error || 'Community service not found'}</p>
          <button
            className="rounded-lg bg-primary px-4 py-2 text-white"
            type="button"
            onClick={handleBack}
          >
            Back
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader
        title={t('editProvider.title')}
        variant="back-and-title"
        onBack={handleBack}
      />
      <main className="flex flex-1 flex-col overflow-y-auto pt-[calc(env(safe-area-inset-top)+24px+40px)] px-6 pb-24">
        <div className="mx-auto w-full max-w-lg space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              communityService.review_status === 'approved' ? 'bg-green-100 text-green-800' :
              communityService.review_status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {communityService.review_status || 'pending'}
            </span>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cs-name">
              Name *
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              id="cs-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="cs-description">
              {t('editProvider.description')}
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              id="cs-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Address section */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-700">{t('editProvider.location')}</legend>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('editProvider.street')}
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="PLZ"
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                />
                <input
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Stadt"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Land"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </fieldset>

          {/* Contact section */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-700">{t('editProvider.contact')}</legend>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Telefon"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </fieldset>

          {/* Social section */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-gray-700">Social</legend>
            <div className="space-y-3">
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Website (https://...)"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </div>
          </fieldset>
        </div>
      </main>

      {/* Reject feedback modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Ablehnen</h2>
            <textarea
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Begründung eingeben…"
              rows={4}
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                disabled={reviewing}
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectFeedback(''); }}
              >
                Abbrechen
              </button>
              <button
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={reviewing || !rejectFeedback.trim()}
                type="button"
                onClick={() => handleReview('rejected', rejectFeedback)}
              >
                {reviewing ? '…' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky save + review footer */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] space-y-2">
        <button
          className="w-full rounded-xl bg-primary py-3 font-medium text-white transition-colors hover:bg-primary-dark active:bg-primary-darker disabled:opacity-50"
          disabled={saving || !name.trim()}
          type="button"
          onClick={handleSave}
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            disabled={reviewing || communityService?.review_status === 'approved'}
            type="button"
            onClick={() => handleReview('approved')}
          >
            {reviewing ? '…' : 'Genehmigen'}
          </button>
          <button
            className="flex-1 rounded-xl bg-yellow-500 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
            disabled={reviewing}
            type="button"
            onClick={() => handleReview('needs_revision')}
          >
            Überarbeitung
          </button>
          <button
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            disabled={reviewing}
            type="button"
            onClick={() => setShowRejectModal(true)}
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}
