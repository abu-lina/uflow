'use client';

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { useFormData } from '@/providers/form-provider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { createProviderOrService } from '@/services/providerService';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/supabase';
import { getCategories } from '@/services/categories';

interface StreamlinedRecommendFormProps {
  onSuccess?: () => void;
  initialCity?: string;
}

// ContactCheckbox component - MUST be outside parent component for memo to work
interface ContactCheckboxProps {
  label: string;
  checked: boolean;
  value: string;
  placeholder: string;
  type?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoFormat?: (value: string) => string;
}

const ContactCheckbox = memo(({
  label,
  checked,
  value,
  placeholder,
  type = 'text',
  onToggle,
  onChange,
  autoFormat,
}: ContactCheckboxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when checkbox is checked
  useEffect(() => {
    if (checked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [checked]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  }, [onToggle]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = autoFormat ? autoFormat(e.target.value) : e.target.value;
    onChange(newValue);
  }, [onChange, autoFormat]);

  return (
    <div
      aria-checked={checked}
      className={cn(
        'flex w-full items-center rounded-2xl border border-border bg-white px-3 py-2 cursor-pointer transition-[height,min-height]',
        checked ? 'min-h-[54px]' : 'h-[54px]'
      )}
      role="checkbox"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
    >
      <div className="flex w-full flex-row items-center gap-2">
        {/* Checkbox Icon */}
        <div className="flex-shrink-0">
          <Icon
            className="h-6 w-6 text-content"
            icon={checked ? 'lucide:square-check' : 'lucide:square'}
          />
        </div>

        {/* Label + Input Container */}
        <div className="flex flex-1 flex-col gap-1">
          {checked ? (
            <>
              {/* Small label when checked */}
              <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
                {label}
              </label>
              {/* Input field */}
              <input
                ref={inputRef}
                aria-label={label}
                className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
                placeholder={placeholder}
                type={type}
                value={value}
                onChange={handleInputChange}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </>
          ) : (
            /* Large label when unchecked */
            <span className="font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  // Only re-render if relevant props changed
  if (prevProps.checked !== nextProps.checked) return false;
  if (prevProps.value !== nextProps.value) return false;
  if (prevProps.label !== nextProps.label) return false;
  if (prevProps.placeholder !== nextProps.placeholder) return false;
  if (prevProps.type !== nextProps.type) return false;
  if (prevProps.onToggle !== nextProps.onToggle) return false;
  if (prevProps.onChange !== nextProps.onChange) return false;
  if (prevProps.autoFormat !== nextProps.autoFormat) return false;
  // All props are equal, skip re-render
  return true;
});

ContactCheckbox.displayName = 'ContactCheckbox';

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
  userEmail: string; // User's email for follow-up
  message: string; // optional
}

export function StreamlinedRecommendForm({ onSuccess, initialCity }: StreamlinedRecommendFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { formData: contextFormData, updateFormData, setCreationMode } = useFormData();
  const { t, language } = useLanguage();
  const isMobile = useIsSmallMobile();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const userEmailInputRef = useRef<HTMLInputElement>(null);
  
  // State for selected contact methods
  const [selectedContacts, setSelectedContacts] = useState<{
    email: boolean;
    phone: boolean;
    website: boolean;
    instagram: boolean;
  }>({
    email: false,
    phone: false,
    website: false,
    instagram: false,
  });
  
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
    userEmail: '',
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
  // Only sync if values actually changed to prevent unnecessary re-renders
  useEffect(() => {
    if (contextFormData.category && contextFormData.category !== formData.category) {
      setFormData(prev => ({ ...prev, category: contextFormData.category }));
    }
    if (contextFormData.offers_ids && contextFormData.offers_ids.length > 0 && 
        JSON.stringify(contextFormData.offers_ids) !== JSON.stringify(formData.offers_ids)) {
      setFormData(prev => ({ ...prev, offers_ids: contextFormData.offers_ids }));
    }
  }, [contextFormData.category, contextFormData.offers_ids, formData.category, formData.offers_ids]);

  // Helper to get category name - memoized
  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(c => c.category_id === categoryId);
    if (!category) return '';
    if (language === 'en') {
      return category.name_en || category.name_de || '';
    }
    return category.name_de || category.name_en || '';
  }, [categories, language]);

  // Memoize category name display to prevent re-renders
  const categoryDisplayName = useMemo(() => {
    return formData.category ? getCategoryName(formData.category) : t('create.recommend.selectCategory');
  }, [formData.category, getCategoryName, t]);

  // Validation - memoized to prevent unnecessary re-renders
  const isFormValid = useMemo(() => {
    const hasBasics = !!formData.title && !!formData.category && !!formData.city;
    const hasContact = 
      (selectedContacts.email && formData.email.trim().length > 0) ||
      (selectedContacts.phone && formData.phone.trim().length > 0) ||
      (selectedContacts.website && formData.website.trim().length > 0) ||
      (selectedContacts.instagram && formData.instagram.trim().length > 0);
    return hasBasics && hasContact;
  }, [formData.title, formData.category, formData.city, formData.email, formData.phone, formData.website, formData.instagram, selectedContacts.email, selectedContacts.phone, selectedContacts.website, selectedContacts.instagram]);

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      if (!formData.title) {
        toast.error(t('create.recommend.titleRequired'));
      } else if (!formData.category) {
        toast.error(t('create.recommend.categoryRequired'));
      } else if (!formData.city) {
        toast.error(t('create.recommend.cityRequired'));
      } else {
        toast.error(t('create.recommend.contactRequired'));
      }
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
        userEmail: formData.userEmail,
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
      // Also clear local userEmail state
      setFormData(prev => ({ ...prev, userEmail: '' }));

      queryClient.invalidateQueries({ queryKey: ['providers'] });
      queryClient.invalidateQueries({ queryKey: ['community-services'] });

      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect back to city overview after successful recommendation
        const city = formData.city || 
          (typeof window !== 'undefined' 
            ? localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity')
            : '');
        
        if (city) {
          router.push(`/city/${encodeURIComponent(city)}`);
        } else {
          // Fallback to home if no city is available
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error creating recommendation:', error);
      toast.error(t('create.recommend.error'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isFormValid, contextFormData, updateFormData, queryClient, router, onSuccess, t]);

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

  // Memoized handlers for ContactCheckbox components to prevent unnecessary re-renders
  const handleEmailChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
  }, []);

  const handleEmailToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.email;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, email: '' }));
      }
      return { ...prev, email: !prev.email };
    });
  }, []);

  const handleWebsiteChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, website: value }));
  }, []);

  const handleWebsiteToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.website;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, website: '' }));
      }
      return { ...prev, website: !prev.website };
    });
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, phone: value }));
  }, []);

  const handlePhoneToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.phone;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, phone: '' }));
      }
      return { ...prev, phone: !prev.phone };
    });
  }, []);

  const handleInstagramChange = useCallback((value: string) => {
    // Auto-add @ if user types without it
    let formattedValue = value;
    if (formattedValue && !formattedValue.startsWith('@')) {
      formattedValue = '@' + formattedValue;
    }
    setFormData(prev => ({ ...prev, instagram: formattedValue }));
  }, []);

  const handleInstagramToggle = useCallback(() => {
    setSelectedContacts(prev => {
      const wasChecked = prev.instagram;
      if (wasChecked) {
        setFormData(prevForm => ({ ...prevForm, instagram: '' }));
      }
      return { ...prev, instagram: !prev.instagram };
    });
  }, []);

  // Memoize translation strings to prevent ContactCheckbox re-renders
  const emailLabel = useMemo(() => t('create.recommend.email'), [t]);
  const emailPlaceholder = useMemo(() => t('create.recommend.emailPlaceholder'), [t]);
  const websiteLabel = useMemo(() => t('create.recommend.website'), [t]);
  const websitePlaceholder = useMemo(() => t('create.recommend.websitePlaceholder'), [t]);
  const phoneLabel = useMemo(() => t('create.recommend.phone'), [t]);
  const phonePlaceholder = useMemo(() => t('create.recommend.phonePlaceholder'), [t]);
  const instagramLabel = useMemo(() => t('create.recommend.instagram'), [t]);
  const instagramPlaceholder = useMemo(() => t('create.recommend.instagramPlaceholder'), [t]);

  return (
    <div className={cn(
      'flex flex-col gap-6',
      // Add extra bottom padding on mobile to account for fixed FooterAction
      isMobile ? 'pb-[calc(80px+24px+env(safe-area-inset-bottom))]' : 'pb-8'
    )}>
      {/* Section 1: Basics */}
      <div className="flex flex-col gap-4">
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
                {categoryDisplayName}
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
      </div>

      {/* Section 2: Contact */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-content-heading">Kontakt zum Anbieter</h3>
          <p className="text-base text-content-muted">
            Bitte wähle mindestens eine Kontaktmethode aus, im Anschluss kannst du dann den jeweiligen Kontakt eintragen - inshaAllah.
          </p>
        </div>

        {/* Contact Checkboxes */}
        <div className="flex flex-col gap-3">
          <ContactCheckbox
            checked={selectedContacts.email}
            label={emailLabel}
            placeholder={emailPlaceholder}
            type="email"
            value={formData.email}
            onChange={handleEmailChange}
            onToggle={handleEmailToggle}
          />

          <ContactCheckbox
            checked={selectedContacts.website}
            label={websiteLabel}
            placeholder={websitePlaceholder}
            type="url"
            value={formData.website}
            onChange={handleWebsiteChange}
            onToggle={handleWebsiteToggle}
          />

          <ContactCheckbox
            checked={selectedContacts.phone}
            label={phoneLabel}
            placeholder={phonePlaceholder}
            type="tel"
            value={formData.phone}
            onChange={handlePhoneChange}
            onToggle={handlePhoneToggle}
          />

          <ContactCheckbox
            checked={selectedContacts.instagram}
            label={instagramLabel}
            placeholder={instagramPlaceholder}
            type="text"
            value={formData.instagram}
            onChange={handleInstagramChange}
            onToggle={handleInstagramToggle}
          />
        </div>
      </div>

      {/* Section 3: User Email */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold text-content-heading">Deine E-Mail-Adresse</h3>
          <p className="text-base text-content-muted">
            Nur für Rückfragen oder um dich zu informieren, wenn deine Stadt freigeschaltet wird.
          </p>
        </div>

        {/* User Email Input */}
        <div className="flex h-[54px] w-full items-center rounded-2xl border border-border bg-white px-3 py-2">
          <div className="flex w-full flex-col gap-1">
            <label className="font-inter-tight text-xs font-normal leading-[15px] text-content-muted">
              Deine E-Mail-Adresse
            </label>
            <input
              ref={userEmailInputRef}
              aria-label="Deine E-Mail-Adresse"
              className="h-[18px] w-full border-none bg-transparent p-0 font-inter text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content focus:outline-none focus:ring-0"
              placeholder="deine@email.de"
              type="email"
              value={formData.userEmail}
              onChange={(e) => {
                const newValue = e.target.value;
                const cursorPosition = e.target.selectionStart || newValue.length;
                setFormData(prev => ({ ...prev, userEmail: newValue }));
                // Maintain focus and cursor position after state update
                setTimeout(() => {
                  if (userEmailInputRef.current) {
                    userEmailInputRef.current.focus();
                    userEmailInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
                  }
                }, 0);
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

      {/* Footer Actions */}
      {isMobile && (
        <FooterAction
          actionButton={{
            disabled: !isFormValid || isSubmitting,
            label: isSubmitting ? t('create.recommend.submitting') : t('create.recommend.submit'),
            loading: isSubmitting,
            loadingText: t('create.recommend.submitting'),
            onClick: handleSubmit,
            variant: 'primary',
          }}
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
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!isFormValid || isSubmitting}
            loading={isSubmitting}
            loadingText={t('create.recommend.submitting')}
            variant="primary"
            onClick={handleSubmit}
          >
            {isSubmitting ? t('create.recommend.submitting') : t('create.recommend.submit')}
          </Button>
        </div>
      )}
    </div>
  );
}

