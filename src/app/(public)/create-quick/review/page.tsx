'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { useAuth } from '@/providers/auth-provider';
import { useFormData } from '@/providers/form-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';

function ReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source'); // 'google' or 'instagram'
  const { user } = useAuth();
  const { formData, clearFormData } = useFormData();
  const isMobile = useIsSmallMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local editable state
  const [editedData, setEditedData] = useState({
    title: formData.title || '',
    description: formData.description || '',
    street: formData.street || '',
    city: formData.city || '',
    zip: formData.zip || '',
    country: formData.country || '',
    phone: formData.phone || '',
    email: formData.email || '',
    website: formData.website || '',
    instagram: formData.instagram || '',
  });

  useEffect(() => {
    // Update local state when formData changes
    setEditedData({
      title: formData.title || '',
      description: formData.description || '',
      street: formData.street || '',
      city: formData.city || '',
      zip: formData.zip || '',
      country: formData.country || '',
      phone: formData.phone || '',
      email: formData.email || '',
      website: formData.website || '',
      instagram: formData.instagram || '',
    });
  }, [formData]);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to create a provider');
      return;
    }

    // Validation
    if (!editedData.title.trim()) {
      toast.error('Business name is required');
      return;
    }

    if (!editedData.city.trim()) {
      toast.error('City is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for insertion
      const insertData = {
        provider_name: editedData.title,
        address_street: editedData.street || null,
        address_zip: editedData.zip || null,
        address_city: editedData.city || null,
        address_country: editedData.country || null,
        show_address: true,
        contact_email: editedData.email || null,
        contact_phone: editedData.phone || null,
        social_website: editedData.website || null,
        social_instagram: editedData.instagram || null,
        user_created_id: user.id,
        provider_owner_id: user.id, // Assuming owner mode for quick create
        barakah_effects: [],
      };

      console.log('Creating provider with data:', insertData);

      const { data: createdProvider, error: providerError } = await supabase
        .from('providers')
        .insert([insertData])
        .select('provider_id')
        .single();

      if (providerError) {
        console.error('Error creating provider:', providerError);
        throw providerError;
      }

      if (!createdProvider) {
        throw new Error('Provider created but no data returned');
      }

      console.log('Provider created successfully:', createdProvider);

      // Clear form data
      clearFormData();

      // Show success message
      toast.success('Business created successfully!');

      // Redirect to provider page
      router.push(`/providers/${createdProvider.provider_id}`);
    } catch (error) {
      console.error('Error creating provider:', error);
      toast.error('Failed to create business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = editedData.title.trim() && editedData.city.trim();

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          Please use mobile view to review your business
        </span>
      </div>
    );
  }

  return (
    <PageLayout hasBackground={false} maxWidth="full">
      <PageHeader
        title="Review & Publish"
        variant="back-and-title"
        onBack="/create-quick"
      />
      <HeaderSpacer />

      <PageContentWrapper maxWidth="full" padding="lg-safe">
        <div className="flex flex-col gap-6 pb-32">
          {/* Source Badge */}
          {source && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                <Icon 
                  className="h-4 w-4 text-primary" 
                  icon={source === 'google' ? 'mdi:google' : 'mdi:instagram'} 
                />
                <span className="text-primary font-medium">
                  Imported from {source === 'google' ? 'Google' : 'Instagram'}
                </span>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Icon
                className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
                icon="mdi:information"
              />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-content-title">
                  Review your details
                </p>
                <p className="text-xs text-content leading-relaxed">
                  We&apos;ve pre-filled the information. Please review and edit as needed before publishing.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#999999] uppercase">
                Business Name *
              </label>
              <input
                className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter business name"
                type="text"
                value={editedData.title}
                onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-[#999999] uppercase">
                Description
              </label>
              <textarea
                className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary min-h-[100px] resize-none"
                placeholder="Describe your business"
                rows={4}
                value={editedData.description}
                onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              />
            </div>

            {/* Location Section */}
            <div className="pt-4 border-t border-[#E5E5E5]">
              <h3 className="text-sm font-semibold text-content-title mb-3">Location</h3>
              
              <div className="flex flex-col gap-4">
                {/* Street */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#999999] uppercase">
                    Street
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Street address"
                    type="text"
                    value={editedData.street}
                    onChange={(e) => setEditedData({ ...editedData, street: e.target.value })}
                  />
                </div>

                {/* City & ZIP */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-[#999999] uppercase">
                      City *
                    </label>
                    <input
                      className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="City"
                      type="text"
                      value={editedData.city}
                      onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-[#999999] uppercase">
                      ZIP
                    </label>
                    <input
                      className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="ZIP"
                      type="text"
                      value={editedData.zip}
                      onChange={(e) => setEditedData({ ...editedData, zip: e.target.value })}
                    />
                  </div>
                </div>

                {/* Country */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#999999] uppercase">
                    Country
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Country"
                    type="text"
                    value={editedData.country}
                    onChange={(e) => setEditedData({ ...editedData, country: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="pt-4 border-t border-[#E5E5E5]">
              <h3 className="text-sm font-semibold text-content-title mb-3">Contact</h3>
              
              <div className="flex flex-col gap-4">
                {/* Phone */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#999999] uppercase">
                    Phone
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Phone number"
                    type="tel"
                    value={editedData.phone}
                    onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#999999] uppercase">
                    Email
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Email address"
                    type="email"
                    value={editedData.email}
                    onChange={(e) => setEditedData({ ...editedData, email: e.target.value })}
                  />
                </div>

                {/* Website */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#999999] uppercase">
                    Website
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="https://..."
                    type="url"
                    value={editedData.website}
                    onChange={(e) => setEditedData({ ...editedData, website: e.target.value })}
                  />
                </div>

                {/* Instagram */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-medium text-[#999999] uppercase">
                    Instagram
                  </label>
                  <input
                    className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Instagram URL"
                    type="url"
                    value={editedData.instagram}
                    onChange={(e) => setEditedData({ ...editedData, instagram: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContentWrapper>

      {/* Fixed Bottom Button */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px] bg-white/80" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-safe-24 pb-4">
          <button
            className={`flex h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-all ${
              !isValid || isSubmitting
                ? 'bg-primary/30 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary-dark'
            }`}
            disabled={!isValid || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Icon className="h-5 w-5 text-white animate-spin" icon="mdi:loading" />
                <span className="text-base font-medium text-white">Publishing...</span>
              </>
            ) : (
              <>
                <Icon className="h-5 w-5 text-white" icon="mdi:check" />
                <span className="text-base font-medium text-white">Publish Business</span>
              </>
            )}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}

