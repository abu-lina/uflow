'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { FormInput } from '@/components/ui/FormInput';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import { getCategories } from '@/services/categories';
import { shouldCreateCommunityService } from '@/utils/categoryUtils';
import { useLanguage } from '@/providers/LanguageProvider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

export default function SelectCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t, language } = useLanguage();
  const isMobile = useIsSmallMobile();

  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

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

  const filteredCategories = categories.filter(category => {
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
    <Layout>
      <PageHeader
        className={cn(
          !isMobile && 'md:top-20 md:z-[100] [&>div]:md:px-0 [&>div]:md:max-w-full'
        )}
        customContent={
          !isMobile ? (
            <div className="w-full max-w-[640px] mx-auto px-6 md:px-8 flex items-center h-header-height-mobile sm:h-header-height-tablet">
              <button
                aria-label={t('common.back')}
                className="flex items-center justify-center w-8 h-8 -ml-1"
                onClick={handleBack}
              >
                <Icon 
                  className="w-8 h-8 text-content-heading pointer-events-none" 
                  icon="material-symbols:chevron-left" 
                />
              </button>
              <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
                {t('create.recommend.selectCategory')}
              </h1>
            </div>
          ) : undefined
        }
        title={t('create.recommend.selectCategory')}
        variant="back-and-title"
        onBack={isMobile ? handleBack : undefined}
      />

      <PageContent 
        className={cn(
          'flex flex-col gap-8',
          !isMobile && 'max-w-[640px] mx-auto px-6 md:px-8'
        )}
        hasFooter={isMobile}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <div className="flex w-full flex-col gap-2">
          <FormInput
            containerClassName="h-[44px] md:h-[48px] rounded-xl"
            inputClassName="text-xs md:text-base font-normal text-[#7C7C7C] leading-[15px] md:leading-[19px] placeholder:text-[#7C7C7C]"
            label=""
            labelClassName="hidden"
            placeholder={t('create.category.searchCategories')}
            rightIcon={<Icon className="h-6 w-6 text-[#1B1D1D]" icon="material-symbols:search" />}
            type="text"
            value={searchQuery}
            variant="with-icon"
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="w-full">
            <p className="text-sm font-normal text-[#7A7A7A] leading-[17px] mb-6 pl-3">
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
                {searchQuery ? t('create.category.noCategoriesFound') : t('create.category.noCategoriesAvailable')}
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
                  className={`w-full rounded-xl px-4 py-2 md:h-[48px] md:py-0 md:flex md:items-center text-left transition-all duration-200 ${
                    formData.category === category.category_id
                      ? 'bg-primary-light text-content-heading border border-primary'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={async () => {
                    const categoryId = category.category_id;
                    const isCommunityService = await shouldCreateCommunityService(categoryId);
                    updateFormData({ 
                      category: categoryId,
                      entityType: isCommunityService ? 'community_service' : 'provider'
                    });
                  }}
                >
                  <span className="text-base font-medium">
                    {getCategoryName(category)}
                  </span>
                </button>
              ))
          )}
        </div>

        {!isMobile && (
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
        )}
      </PageContent>

      {isMobile && (
        <FooterAction
          actionButton={{
            label: t('actions.save'),
            icon: 'lucide:save',
            onClick: handleSave,
            disabled: !formData.category,
            variant: 'primary',
          }}
        />
      )}
    </Layout>
  );
}

