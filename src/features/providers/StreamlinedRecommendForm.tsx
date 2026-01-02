'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { createProviderOrService } from '@/services/providerService';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import type { Category } from '@/types/supabase';
import { getCategories } from '@/services/categories';

interface StreamlinedRecommendFormProps {
  onSuccess?: () => void;
  initialCity?: string;
}

interface RecommendFormData {
  // Step 1: Basics (all required)
  title: string;
  category: string;
  city: string;
  offers_ids: string[];
  
  // Step 2: Contact (at least one required)
  email: string;
  phone: string;
  website: string;
  instagram: string;
  message: string; // optional
}

const STEPS = [
  {
    title: 'Basics',
    icon: 'mdi:information',
  },
  {
    title: 'Contact',
    icon: 'mdi:account-group',
  },
];

export function StreamlinedRecommendForm({ onSuccess, initialCity }: StreamlinedRecommendFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData: contextFormData, updateFormData, setCreationMode } = useFormData();
  const { t, language } = useLanguage();
  const isMobile = useIsSmallMobile();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Local form state for streamlined form
  const [formData, setFormData] = useState<RecommendFormData>({
    title: contextFormData.title || '',
    category: contextFormData.category || '',
    city: initialCity || '',
    offers_ids: contextFormData.offers_ids || [],
    email: contextFormData.email || '',
    phone: contextFormData.phone || '',
    website: contextFormData.website || '',
    instagram: contextFormData.instagram || '',
    message: contextFormData.description || '',
  });

  // Set creation mode to recommendation on mount
  useEffect(() => {
    setCreationMode('recommendation');
  }, [setCreationMode]);

  // Load city from localStorage if not provided
  useEffect(() => {
    if (!formData.city && typeof window !== 'undefined') {
      const savedCity = localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity');
      if (savedCity) {
        setFormData(prev => ({ ...prev, city: savedCity }));
      }
    }
  }, [formData.city]);

  // Load categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    void fetchCategories();
  }, []);

  // Sync with context formData when it changes (from navigation)
  useEffect(() => {
    if (contextFormData.category && contextFormData.category !== formData.category) {
      setFormData(prev => ({ ...prev, category: contextFormData.category }));
    }
    if (contextFormData.offers_ids && contextFormData.offers_ids.length > 0) {
      setFormData(prev => ({ ...prev, offers_ids: contextFormData.offers_ids }));
    }
  }, [contextFormData.category, contextFormData.offers_ids, formData.category]);

  // Helper to get category name
  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(c => c.category_id === categoryId);
    if (!category) return '';
    if (language === 'en') {
      return category.name_en || category.name_de || '';
    }
    return category.name_de || category.name_en || '';
  }, [categories, language]);

  // Validation
  const isStep1Valid = useCallback(() => {
    return !!formData.title && !!formData.category && formData.offers_ids.length > 0 && !!formData.city;
  }, [formData]);

  const isStep2Valid = useCallback(() => {
    const hasEmail = formData.email.trim().length > 0;
    const hasPhone = formData.phone.trim().length > 0;
    const hasWebsite = formData.website.trim().length > 0;
    const hasInstagram = formData.instagram.trim().length > 0;
    return hasEmail || hasPhone || hasWebsite || hasInstagram;
  }, [formData]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (currentStep === 0 && !isStep1Valid()) {
      if (!formData.title) {
        toast.error(t('create.recommend.titleRequired'));
      } else if (!formData.category) {
        toast.error(t('create.recommend.categoryRequired'));
      } else if (formData.offers_ids.length === 0) {
        toast.error(t('create.recommend.offersRequired'));
      } else if (!formData.city) {
        toast.error(t('create.recommend.cityRequired'));
      }
      return;
    }
    setCurrentStep(1);
  }, [currentStep, isStep1Valid, formData, t]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) {
      router.push('/');
    } else {
      setCurrentStep(0);
    }
  }, [currentStep, router]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!isStep2Valid()) {
      toast.error(t('create.recommend.contactRequired'));
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare formData for service function
      const serviceFormData = {
        ...contextFormData,
        title: formData.title,
        category: formData.category,
        city: formData.city,
        offers_ids: formData.offers_ids,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        instagram: formData.instagram,
        description: formData.message,
        creationMode: 'recommendation' as const,
        entityType: 'provider' as const,
        isOnlineBusiness: false,
        street: '',
        zip: '',
        country: '',
        showAddress: false,
        needs_ids: [],
        images: [],
        selectedCommunityServiceIds: [],
        tags: [],
        socialCategory: '',
        socialTitle: '',
        socialDescription: '',
      };

      await createProviderOrService(
        serviceFormData,
        null, // Anonymous user
        true // Recommendation mode
      );

      toast.success(t('create.recommend.success'));

      // Clear form data
      updateFormData({
        title: '',
        category: '',
        city: '',
        offers_ids: [],
        email: '',
        phone: '',
        website: '',
        instagram: '',
        description: '',
      });

      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/waitlist');
      }
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast.error(t('create.recommend.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isStep2Valid, contextFormData, updateFormData, queryClient, router, onSuccess, t]);

  // Navigate to category selection
  const handleSelectCategory = useCallback(() => {
    // Save current form state
    updateFormData({
      title: formData.title,
      city: formData.city,
      offers_ids: formData.offers_ids,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      instagram: formData.instagram,
      description: formData.message,
    });
    router.push('/create/recommend/category');
  }, [formData, router, updateFormData]);

  // Navigate to offers selection
  const handleSelectOffers = useCallback(() => {
    // Save current form state
    updateFormData({
      title: formData.title,
      category: formData.category,
      city: formData.city,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      instagram: formData.instagram,
      description: formData.message,
    });
    router.push('/create/recommend/offers');
  }, [formData, router, updateFormData]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Step Indicator */}
      <div className="mb-6">
        <StepIndicator currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Step 1: Basics */}
      {currentStep === 0 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-content-heading">{t('create.recommend.step1Title')}</h2>
          
          {/* Provider Name */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.providerName')} *
              </label>
              <input
                aria-label={t('create.recommend.providerName')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.providerNamePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>

          {/* Category */}
          <div 
            aria-label={t('create.recommend.selectCategory')}
            className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={handleSelectCategory}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectCategory();
              }
            }}
          >
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.category')} *
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
                  {formData.category ? getCategoryName(formData.category) : t('create.recommend.selectCategory')}
                </span>
                <Icon className="h-5 w-5 text-content-muted" icon="material-symbols:chevron-right" />
              </div>
            </div>
          </div>

          {/* City */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.city')} *
              </label>
              <input
                aria-label={t('create.recommend.city')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.cityPlaceholder')}
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          {/* Offers */}
          <div 
            aria-label={t('create.recommend.selectOffers')}
            className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={handleSelectOffers}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectOffers();
              }
            }}
          >
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.offers')} *
              </label>
              <div className="flex items-center justify-between">
                <span className="text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
                  {formData.offers_ids.length > 0 
                    ? t('create.recommend.offersSelected').replace('{{count}}', formData.offers_ids.length.toString())
                    : t('create.recommend.selectOffers')
                  }
                </span>
                <Icon className="h-5 w-5 text-content-muted" icon="material-symbols:chevron-right" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Contact */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-content-heading">{t('create.recommend.step2Title')}</h2>
          <p className="text-base text-content-muted">{t('create.recommend.step2Description')}</p>
          
          {/* Email */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.email')}
              </label>
              <input
                aria-label={t('create.recommend.email')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.emailPlaceholder')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.phone')}
              </label>
              <input
                aria-label={t('create.recommend.phone')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.phonePlaceholder')}
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>

          {/* Website */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.website')}
              </label>
              <input
                aria-label={t('create.recommend.website')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.websitePlaceholder')}
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
          </div>

          {/* Instagram */}
          <div className="flex h-[56px] w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <div className="flex w-full flex-col gap-1">
              <label className="text-xs leading-[15px] text-content-muted">
                {t('create.recommend.instagram')}
              </label>
              <input
                aria-label={t('create.recommend.instagram')}
                className="h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={t('create.recommend.instagramPlaceholder')}
                type="text"
                value={formData.instagram}
                onChange={(e) => {
                  let value = e.target.value;
                  // Auto-add @ if user types without it
                  if (value && !value.startsWith('@')) {
                    value = '@' + value;
                  }
                  setFormData(prev => ({ ...prev, instagram: value }));
                }}
              />
            </div>
          </div>

          {/* Message (Optional) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs leading-[15px] text-content-muted">
              {t('create.recommend.message')} ({t('common.optional')})
            </label>
            <textarea
              aria-label={t('create.recommend.message')}
              className="min-h-[120px] w-full rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('create.recommend.messagePlaceholder')}
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {isMobile && (
        <FooterAction
          actionButton={
            currentStep === 0
              ? {
                  label: t('common.next'),
                  trailingIcon: 'lucide:chevron-right',
                  onClick: handleNext,
                  disabled: !isStep1Valid() || isSubmitting,
                  variant: 'primary',
                }
              : {
                  label: isSubmitting ? t('create.recommend.submitting') : t('create.recommend.submit'),
                  onClick: handleSubmit,
                  disabled: !isStep2Valid() || isSubmitting,
                  loading: isSubmitting,
                  loadingText: t('create.recommend.submitting'),
                  variant: 'primary',
                }
          }
        />
      )}

      {/* Desktop Actions */}
      {!isMobile && (
        <div className="flex gap-4 pt-4">
          <Button
            disabled={isSubmitting}
            variant="secondary"
            onClick={handleBack}
          >
            {currentStep === 0 ? t('common.cancel') : t('common.back')}
          </Button>
          <Button
            disabled={
              (currentStep === 0 && !isStep1Valid()) ||
              (currentStep === 1 && (!isStep2Valid() || isSubmitting))
            }
            loading={currentStep === 1 && isSubmitting}
            loadingText={t('create.recommend.submitting')}
            trailingIcon={currentStep === 0 ? 'lucide:chevron-right' : undefined}
            variant="primary"
            onClick={currentStep === 0 ? handleNext : handleSubmit}
          >
            {currentStep === 0 ? t('common.next') : (isSubmitting ? t('create.recommend.submitting') : t('create.recommend.submit'))}
          </Button>
        </div>
      )}
    </div>
  );
}

