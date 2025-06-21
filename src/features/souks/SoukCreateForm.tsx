'use client';

import { useState, useEffect } from 'react';

import { Icon } from '@iconify/react';

import { StepIndicator } from '@/components/shared/StepIndicator';
import { TagsMultiSelect } from '@/components/souks/TagsMultiSelect';
import { FormField } from '@/components/ui/FormField';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { SoukFormData } from '@/types/souk';
import type { Category } from '@/types/supabase';

interface ExtendedFormData extends SoukFormData {
  website: string;
  instagram: string;
  phone: string;
  email: string;
  images: File[];
  tags: string[];
}

const STEPS = [
  {
    title: 'Basic Info',
    icon: 'mdi:information',
  },
  {
    title: 'Location',
    icon: 'mdi:map-marker',
  },
  {
    title: 'Contact & Social',
    icon: 'mdi:account-group',
  },
  {
    title: 'Media & Tags',
    icon: 'mdi:image-multiple',
  },
];

export function SoukCreateForm() {
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
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setCategories(data);
      }
      setCategoriesLoading(false);
    }
    void fetchCategories();
  }, []);

  const handleInputChange = (field: keyof ExtendedFormData, value: string | string[] | File[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...files] }));
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
    for (const file of formData.images) {
      const fileExt = file.name.split('.').pop();
      const filePath = `souks/${Date.now()}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
      if (uploadError) {
        // Optionally show a toast or error message
        continue;
      }
      const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        // Only allow trusted domain
        try {
          const { hostname } = new URL(publicUrlData.publicUrl);
          if (hostname === 'pmbatjlosstytdmmqkky.supabase.co') {
            uploadedUrls.push(publicUrlData.publicUrl);
          }
        } catch {
          // Ignore invalid URLs
        }
      }
    }

    // 2. Save souk with trusted Supabase image URLs
    const insertData = {
      souk_name: formData.title,
      souk_description: formData.description,
      address_street: formData.street,
      address_zip: formData.zip,
      address_city: formData.city,
      category_id: formData.category,
      contact_email: formData.email || null,
      contact_phone: formData.phone || null,
      social_website: formData.website || null,
      social_instagram: formData.instagram || null,
      barakah_effects: formData.tags,
      souk_owner_id: user.id,
      address_country: 'DE',
      souk_images: JSON.stringify({ urls: uploadedUrls }),
    };
    const { error } = await supabase.from('souks').insert([insertData]);
    setIsSubmitting(false);
    if (error) {
      alert(`Fehler beim Erstellen des Souks: ${error.message}`);
    } else {
      alert('Souk erfolgreich erstellt!');
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  function isStepValid(step: number, data: ExtendedFormData) {
    switch (step) {
      case 0:
        return !!data.title && !!data.category && !!data.description;
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
    <form className="mx-auto w-full max-w-xl px-4" onSubmit={handleSubmit}>
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      <div className="mt-8 space-y-6">
        {currentStep === 0 && (
          <>
            <FormField.Input
              required
              label="TITEL"
              name="title"
              placeholder="Titel eingeben"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
            <div className="flex w-full flex-col items-start gap-2">
              <label className="font-inter text-base text-[#999999]" htmlFor="category">
                KATEGORIE <span className="ml-1 text-red-500">*</span>
              </label>
              <select
                required
                className="h-10 w-full rounded-[15px] border border-[#D4D4D4] bg-white px-4 font-inter text-[15px] text-[#272727] outline-none transition-colors focus:border-[#BFDBD8] focus:ring-1 focus:ring-[#BFDBD8]"
                disabled={categoriesLoading}
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                <option disabled value="">
                  {categoriesLoading ? 'Lade Kategorien...' : 'Kategorie auswählen'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name_de || cat.name_en}
                  </option>
                ))}
              </select>
            </div>
            <FormField.Textarea
              required
              label="BESCHREIBUNG"
              name="description"
              placeholder="Beschreibung eingeben"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </>
        )}

        {currentStep === 1 && (
          <>
            <FormField.Input
              required
              label="STRASSE"
              name="street"
              placeholder="Straße eingeben"
              value={formData.street}
              onChange={(e) => handleInputChange('street', e.target.value)}
            />
            <FormField.Input
              required
              label="PLZ"
              name="zip"
              placeholder="PLZ eingeben"
              value={formData.zip}
              onChange={(e) => handleInputChange('zip', e.target.value)}
            />
            <FormField.Input
              required
              label="STADT"
              name="city"
              placeholder="Stadt eingeben"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
            />
          </>
        )}

        {currentStep === 2 && (
          <>
            <FormField.Input
              label="WEBSITE"
              name="website"
              placeholder="Website eingeben"
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
            />
            <FormField.Input
              label="INSTAGRAM"
              name="instagram"
              placeholder="Instagram eingeben"
              value={formData.instagram}
              onChange={(e) => handleInputChange('instagram', e.target.value)}
            />
            <FormField.Input
              label="TELEFON"
              name="phone"
              placeholder="Telefon eingeben"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
            <FormField.Input
              label="EMAIL"
              name="email"
              placeholder="Email eingeben"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
            />
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="space-y-2">
              <label className="font-inter text-base text-[#999999]" htmlFor="images-upload">
                BILDER
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
          </>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        {currentStep > 0 && (
          <button
            className="rounded-[9.6px] bg-gray-100 px-6 py-2 font-inter text-[15px] text-[#272727] transition-colors hover:bg-gray-200"
            type="button"
            onClick={prevStep}
          >
            Zurück
          </button>
        )}
        <button
          className={[
            'ml-auto rounded-[9.6px] bg-primary px-6 py-2 font-inter text-[15px] text-white transition-colors',
            currentStep === 0 ? 'w-full' : '',
            isSubmitting || !isStepValid(currentStep, formData)
              ? 'cursor-not-allowed opacity-50 hover:bg-primary'
              : 'hover:bg-primary/90',
          ].join(' ')}
          disabled={isSubmitting || !isStepValid(currentStep, formData)}
          type={currentStep === STEPS.length - 1 ? 'submit' : 'button'}
          onClick={currentStep < STEPS.length - 1 ? nextStep : undefined}
        >
          {isSubmitting ? (
            <Icon className="size-5 animate-spin" icon="mdi:loading" />
          ) : currentStep === STEPS.length - 1 ? (
            'Souk erstellen'
          ) : (
            'Weiter'
          )}
        </button>
      </div>
    </form>
  );
}
