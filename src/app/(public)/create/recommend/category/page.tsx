'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import { getCategories } from '@/services/categories';
import { shouldCreateCommunityService } from '@/utils/categoryUtils';
import { useLanguage } from '@/providers/LanguageProvider';
import { cn } from '@/lib/utils';

export default function SelectCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
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

  const getCategoryName = (category: Category) => {
    if (language === 'en') {
      return category.name_en || category.name_de || category.category_id || '';
    } else if (language === 'de') {
      return category.name_de || category.name_en || category.category_id || '';
    } else {
      return category.name_en || category.name_de || category.category_id || '';
    }
  };

  const filteredCategories = categories.filter((category) => {
    const categoryName = getCategoryName(category);
    return categoryName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSave = () => {
    if (formData.category) {
      router.push('/create/recommend');
    }
  };

  const handleBack = () => {
    router.push('/create/recommend');
  };

  return (
    <ScrollablePageLayout>
      <PageHeader
        className={cn('md:top-20 md:z-[100] [&>div]:md:max-w-full [&>div]:md:px-0')}
        title={t('create.recommend.selectCategory')}
        variant="back-and-title"
        onBack={handleBack}
      />

      <PageContent
        hasFooter
        className={cn('flex flex-col gap-8', 'sm:mx-auto sm:max-w-[640px] sm:px-6 md:px-8')}
        maxWidth="full"
        paddingX="px-6 sm:px-0"
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex h-[54px] w-full items-center rounded-xl border border-[#D4D4D4] bg-white px-3">
            <Icon className="mr-2 h-6 w-6 flex-shrink-0 text-[#1B1D1D]" icon="lucide:search" />
            <input
              className="flex-1 border-none bg-transparent px-0 text-base font-normal leading-[19px] text-[#7C7C7C] placeholder:text-[#7C7C7C] focus:outline-none"
              placeholder={t('create.category.searchCategories')}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full">
            <p className="mb-6 pl-3 text-sm font-normal leading-[17px] text-[#7A7A7A]">
              {t('create.category.searchDescription')}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {categoriesLoading ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-gray-500">{t('create.category.loadingCategories')}</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <span className="text-gray-500">
                {searchQuery
                  ? t('create.category.noCategoriesFound')
                  : t('create.category.noCategoriesAvailable')}
              </span>
            </div>
          ) : (
            filteredCategories
              .sort((a, b) => {
                const nameA = getCategoryName(a).toLowerCase();
                const nameB = getCategoryName(b).toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .map((category) => (
                <button
                  key={category.category_id}
                  className={`flex h-[54px] w-full items-center rounded-xl px-4 text-left transition-all duration-200 ${
                    formData.category === category.category_id
                      ? 'border border-primary bg-primary-light text-content-heading'
                      : 'border border-gray-200 bg-white text-[#232323] hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={async () => {
                    const categoryId = category.category_id;
                    const isCommunityService = await shouldCreateCommunityService(categoryId);
                    updateFormData({
                      category: categoryId,
                      entityType: isCommunityService ? 'community_service' : 'provider',
                    });
                  }}
                >
                  <span className="text-base font-medium">{getCategoryName(category)}</span>
                </button>
              ))
          )}
        </div>

        {/* Desktop only */}
        <div className="hidden sm:block">
          <div className="flex flex-col gap-3 pt-4">
            <Button
              fullWidth
              disabled={!formData.category}
              icon="lucide:save"
              variant="primary"
              onClick={handleSave}
            >
              {t('actions.save')}
            </Button>
          </div>
        </div>
      </PageContent>

      {/* Mobile only */}
      <div className="sm:hidden">
        <FooterAction
          actionButton={{
            label: t('actions.save'),
            icon: 'lucide:save',
            onClick: handleSave,
            disabled: !formData.category,
            variant: 'primary',
          }}
        />
      </div>
    </ScrollablePageLayout>
  );
}
