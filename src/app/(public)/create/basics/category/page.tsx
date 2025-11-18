'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { FormInput } from '@/components/ui/FormInput';
import { FooterAction } from '@/components/ui/FooterAction';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import { getCategories } from '@/services/categories';
import { shouldCreateCommunityService } from '@/utils/categoryUtils';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SelectCategoryPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t, language } = useLanguage();

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setChecked(true);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      try {
        // Get all categories so users can choose to create either providers or community services
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback to all categories if filtered fetch fails
        const { data, error: fallbackError } = await supabase
          .from('categories')
          .select('*')
          .order('name_de', { ascending: true });
        if (!fallbackError && data) {
          setCategories(data);
        }
      }
      setCategoriesLoading(false);
    }
    void fetchCategories();
  }, []);



  if (!checked) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.category.desktopMessage')}
        </span>
      </div>
    );
  }


  // Helper function to get category name based on current language
  // Categories only have name_de and name_en, so for other languages we fall back to English or German
  const getCategoryName = (category: Category) => {
    if (language === 'en') {
      return category.name_en || category.name_de || category.category_id || '';
    } else if (language === 'de') {
      return category.name_de || category.name_en || category.category_id || '';
    } else {
      // For Arabic, Turkish, or any other language, prefer English, then German
      return category.name_en || category.name_de || category.category_id || '';
    }
  };

  const filteredCategories = categories.filter(category => {
    const categoryName = getCategoryName(category);
    return categoryName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSave = () => {
    if (formData.category) {
      router.push('/create/basics');
    }
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        title={t('create.category.selectCategory')}
        variant="back-and-title"
        onBack="/create/basics"
      />

      <PageContent hasFooter className="flex flex-col gap-8">
        {/* Search Bar + Subtitle */}
        <div className="flex w-full flex-col gap-2">
          {/* Search Bar */}
          <FormInput
            containerClassName="h-[40px] py-0"
            inputClassName="text-xs font-normal text-[#7C7C7C] leading-[15px] placeholder:text-[#7C7C7C] h-full"
            label=""
            labelClassName="hidden"
            placeholder={t('create.category.searchCategories')}
            rightIcon={<Icon className="h-6 w-6 text-[#1B1D1D]" icon="material-symbols:search" />}
            type="text"
            value={searchQuery}
            variant="with-icon"
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Subtitle */}
          <div className="w-full">
            <p className="text-sm font-normal text-[#7A7A7A] leading-[17px] mb-6 pl-3">
              {t('create.category.searchDescription')}
            </p>
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 space-y-2">
          {categoriesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-gray-500">{t('create.category.loadingCategories')}</span>
            </div>
          ) : (
            filteredCategories
              .sort((a, b) => {
                // Sort by localized name
                const nameA = getCategoryName(a).toLowerCase();
                const nameB = getCategoryName(b).toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .map((category) => (
                <button
                  key={category.category_id}
                  className={`w-full rounded-xl px-4 py-2 text-left transition-all duration-200 ${
                    formData.category === category.category_id
                      ? 'bg-primary-light text-content-heading border border-primary'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={async () => {
                    const categoryId = category.category_id;
                    const isCommunityService = await shouldCreateCommunityService(categoryId);
                    console.log('Category selected:', getCategoryName(category), 'ID:', categoryId);
                    console.log('Should create community service:', isCommunityService);
                    updateFormData({ 
                      category: categoryId,
                      entityType: isCommunityService ? 'community_service' : 'provider'
                    });
                    console.log('Updated formData entityType to:', isCommunityService ? 'community_service' : 'provider');
                    
                    // Also log the current form data to verify it's being updated
                    setTimeout(() => {
                      console.log('Form data after update:', { category: categoryId, entityType: isCommunityService ? 'community_service' : 'provider' });
                    }, 100);
                  }}
                >
                  <span className="text-sm font-medium">
                    {getCategoryName(category)}
                  </span>
                </button>
              ))
          )}
        </div>
      </PageContent>

      {/* Footer Action */}
      <FooterAction
        actionButton={{
          label: t('actions.save'),
          icon: 'lucide:save',
          onClick: handleSave,
          disabled: !formData.category,
          variant: 'primary',
        }}
      />
    </ScrollablePageLayout>
  );
}
