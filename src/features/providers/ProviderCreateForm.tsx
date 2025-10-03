'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';

import { Icon } from '@iconify/react';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { TagsMultiSelect } from '@/components/providers/TagsMultiSelect';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { ProviderFormData } from '@/types/provider';
import type { Category } from '@/types/supabase';
import type { Offer, Need } from '@/types/offer';

interface ExtendedFormData extends ProviderFormData {
  website: string;
  instagram: string;
  phone: string;
  email: string;
  images: File[];
  tags: string[];
  offers_ids: string[];
  needs_ids: string[];
}

const STEPS = [
  {
    title: 'Basics',
    icon: 'mdi:information',
  },
  {
    title: 'Location',
    icon: 'mdi:map-marker',
  },
  {
    title: 'Contact',
    icon: 'mdi:account-group',
  },
  {
    title: 'Media',
    icon: 'mdi:image-multiple',
  },
];

interface ProviderCreateFormProps {
  searchParams?: ReadonlyURLSearchParams | null;
}

export function ProviderCreateForm({ searchParams }: ProviderCreateFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
      const [formData, setFormData] = useState<ExtendedFormData>({
        title: '',
        category: '',
        description: '',
        street: '',
        zip: '',
        city: '',
        website: '',
        instagram: '',
        phone: '',
        email: '',
        images: [],
        tags: [],
        offers_ids: [],
        needs_ids: [],
      });
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setCategories(data);
      }
    }
    void fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchOffers() {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setOffers(data);
      }
    }
    void fetchOffers();
  }, []);

  useEffect(() => {
    async function fetchNeeds() {
      const { data, error } = await supabase
        .from('needs')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setNeeds(data);
      }
    }
    void fetchNeeds();
  }, []);


  // Load all form data from URL params on mount
  useEffect(() => {
    if (searchParams) {
      setFormData(prev => ({
        ...prev,
        title: searchParams.get('title') || prev.title,
        category: searchParams.get('categoryId') || prev.category,
        description: searchParams.get('description') || prev.description,
        street: searchParams.get('street') || prev.street,
        zip: searchParams.get('zip') || prev.zip,
        city: searchParams.get('city') || prev.city,
        website: searchParams.get('website') || prev.website,
        instagram: searchParams.get('instagram') || prev.instagram,
        phone: searchParams.get('phone') || prev.phone,
        email: searchParams.get('email') || prev.email,
        offers_ids: searchParams.get('offersIds') ? JSON.parse(searchParams.get('offersIds') || '[]') : prev.offers_ids,
        needs_ids: searchParams.get('needsIds') ? JSON.parse(searchParams.get('needsIds') || '[]') : prev.needs_ids,
      }));
    }
  }, [searchParams]);

  const handleInputChange = (field: keyof ExtendedFormData, value: string | string[] | File[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Helper function to build URL with current form data
  const buildUrlWithFormData = (baseUrl: string, additionalParams: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    
    // Add current form data to URL params
    if (formData.title) params.set('title', formData.title);
    if (formData.category) params.set('categoryId', formData.category);
    if (formData.description) params.set('description', formData.description);
    if (formData.street) params.set('street', formData.street);
    if (formData.zip) params.set('zip', formData.zip);
    if (formData.city) params.set('city', formData.city);
    if (formData.website) params.set('website', formData.website);
    if (formData.instagram) params.set('instagram', formData.instagram);
    if (formData.phone) params.set('phone', formData.phone);
    if (formData.email) params.set('email', formData.email);
    if (formData.offers_ids.length > 0) params.set('offersIds', JSON.stringify(formData.offers_ids));
    if (formData.needs_ids.length > 0) params.set('needsIds', JSON.stringify(formData.needs_ids));
    
    // Add any additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      console.log(
        'Selected files:',
        files.length,
        files.map((f) => f.name),
      );
      setFormData((prev) => ({ ...prev, images: files }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!user) {
      setIsSubmitting(false);
      return;
    }

    // 1. Upload images to Supabase Storage and collect trusted URLs
    const uploadedUrls: string[] = [];
    console.log(
      'Images to upload:',
      formData.images.length,
      formData.images.map((f) => f.name),
    );

    for (const file of formData.images) {
      const fileExt = file.name.split('.').pop();
      const filePath = `providers/${Date.now()}-${Math.random()}.${fileExt}`;
      console.log('Uploading file:', file.name, 'to path:', filePath);

      const { error: uploadError } = await supabase.storage.from('provider-images').upload(filePath, file);
      if (uploadError) {
        console.error('Upload error for', file.name, ':', uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase.storage.from('provider-images').getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        // Only allow trusted domain (current Supabase project)
        try {
          const { hostname } = new URL(publicUrlData.publicUrl);
          const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
          if (hostname === supabaseUrl.hostname) {
            uploadedUrls.push(publicUrlData.publicUrl);
            console.log('Successfully uploaded:', file.name, 'URL:', publicUrlData.publicUrl);
          }
        } catch {
          console.error('Invalid URL for', file.name);
        }
      }
    }

    console.log('Total uploaded URLs:', uploadedUrls.length);

    // 2. Save provider with trusted Supabase image URLs
    const insertData = {
      provider_name: formData.title,
      provider_offers: formData.description,
      provider_needs: null, // Keep for backward compatibility
      address_street: formData.street,
      address_zip: formData.zip,
      address_city: formData.city,
      category_id: formData.category,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      barakah_effects: formData.tags,
      provider_owner_id: user.id,
      address_country: 'DE',
      provider_images: JSON.stringify({ urls: uploadedUrls }),
          offers_ids: formData.offers_ids.length > 0 ? formData.offers_ids : null,
          needs_ids: formData.needs_ids.length > 0 ? formData.needs_ids : null,
    };
    
    const { error: providerError } = await supabase
      .from('providers')
      .insert([insertData]);
    
    if (providerError) {
      setIsSubmitting(false);
      alert(`Fehler beim Erstellen des Providers: ${providerError.message}`);
      return;
    }

    setIsSubmitting(false);
    // Redirect immediately without blocking alert
    router.push('/profile');
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };


  function isStepValid(step: number, data: ExtendedFormData) {
    switch (step) {
      case 0:
        return !!data.title && !!data.category && data.offers_ids.length > 0;
      case 1:
        return !!data.street && !!data.zip && !!data.city;
      case 2:
        // All optional, so always valid
        return true;
      case 3:
        // At least one tag required
        return data.tags.length > 0;
      default:
        return false;
    }
  }

  return (
    <div className="flex w-full max-w-[361px] flex-1 flex-col">
      {/* Step Indicator */}
      <div className="mb-12">
        <StepIndicator currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Form Content */}
      <div className="flex flex-1 flex-col">
        <form className="flex flex-1 flex-col" onSubmit={handleSubmit}>
          {/* Form Fields */}
          <div className="flex flex-1 flex-col gap-8 pb-8">
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-[#232323] px-3">Basics</h2>
                
                <div className="space-y-3">
                  {/* First Name Field */}
                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Titel *</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Titel eingeben"
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Category Field */}
                  <button
                    className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push(buildUrlWithFormData('/create/category'))}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Kategorie *</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left">
                        {formData.category 
                          ? categories.find(cat => cat.category_id === formData.category)?.name_de || 
                            categories.find(cat => cat.category_id === formData.category)?.name_en || 
                            'Kategorie auswählen'
                          : 'Kategorie auswählen'
                        }
                      </div>
                    </div>
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </button>

                  {/* What I Offer Field */}
                  <button
                    className="flex w-[345px] min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push(buildUrlWithFormData('/create/offers'))}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Was biete ich? *</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                        {formData.offers_ids.length > 0 
                          ? formData.offers_ids.map(id => offers.find(offer => offer.offer_id === id)?.name_de).filter(Boolean).join(', ')
                          : 'Angebote auswählen'
                        }
                      </div>
                    </div>
                    <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                      <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                    </div>
                  </button>

                  {/* What I'm Looking For Field */}
                  <button
                    className="flex w-[345px] min-h-[54px] rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm"
                    type="button"
                    onClick={() => router.push(buildUrlWithFormData('/create/needs'))}
                  >
                    <div className="flex flex-1 flex-col gap-1 items-start">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Was suche ich?</span>
                      <div className="text-[15px] font-medium text-[#272727] leading-[18px] tracking-[0.15px] text-left break-words">
                        {formData.needs_ids.length > 0 
                          ? formData.needs_ids.map(id => needs.find(need => need.need_id === id)?.name_de).filter(Boolean).join(', ')
                          : 'Gesuche auswählen'
                        }
                      </div>
                    </div>
                    <div className="flex items-center justify-center ml-2 flex-shrink-0 self-center">
                      <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-[#232323] px-3">Location</h2>
                
                <div className="space-y-3">
                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Straße *</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Straße eingeben"
                        type="text"
                        value={formData.street}
                        onChange={(e) => handleInputChange('street', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>

                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">PLZ *</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="PLZ eingeben"
                        type="text"
                        value={formData.zip}
                        onChange={(e) => handleInputChange('zip', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>

                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Stadt *</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Stadt eingeben"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-[#232323] px-3">Contact</h2>
                
                <div className="space-y-3">
                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Website</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Website eingeben"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>

                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Instagram</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Instagram eingeben"
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => handleInputChange('instagram', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>

                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Telefon</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Telefon eingeben"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>

                  <div className="flex h-[54px] w-[345px] items-center rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-xs font-normal text-[#999999] leading-[15px]">Email</span>
                      <input
                        className="text-[15px] font-medium text-[#272727] leading-[18px] placeholder:text-[#999999] outline-none tracking-[0.15px] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent p-0"
                        placeholder="Email eingeben"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className="flex-1" />
                    <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:chevron-right" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-[#232323] px-3">Media</h2>
                
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs text-[#999999]" htmlFor="images-upload">
                      Bilder
                    </label>
                    <input
                      multiple
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-primary/90"
                      id="images-upload"
                      type="file"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <TagsMultiSelect
                    required
                    selected={formData.tags}
                    onChange={(tags) => handleInputChange('tags', tags)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Weiter Button */}
          <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
            <div className="flex h-[80px] w-full items-center justify-center px-4">
              <button
                className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
                  isSubmitting || !isStepValid(currentStep, formData)
                    ? 'bg-[#589D96] opacity-30 cursor-not-allowed'
                    : 'bg-[#589D96] opacity-100'
                }`}
                disabled={isSubmitting || !isStepValid(currentStep, formData)}
                type={currentStep === STEPS.length - 1 ? 'submit' : 'button'}
                onClick={currentStep === STEPS.length - 1 ? undefined : nextStep}
              >
                {isSubmitting ? (
                  <Icon className="h-5 w-5 animate-spin text-white" icon="mdi:loading" />
                ) : (
                  <>
                    <span className="text-base font-medium text-white leading-[19px]">
                      Weiter
                    </span>
                    <Icon className="h-6 w-6 text-white" icon="material-symbols:chevron-right" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
