'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { DesktopCreateLayout } from '@/components/layout/DesktopCreateLayout';
import { PageContent } from '@/components/layout/PageContent';
import { FooterAction } from '@/components/ui/FooterAction';
import { Button } from '@/components/ui/Button';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import { getSocialProjectCategories } from '@/services/categories';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SelectSocialCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();
  const isMobile = useIsSmallMobile();

  // Choose layout based on screen size
  const Layout = isMobile ? ScrollablePageLayout : DesktopCreateLayout;

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      try {
        // Use the filtered categories service for social projects
        const categoriesData = await getSocialProjectCategories();
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


  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name_de?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    router.push('/create/media/social');
  };

  const handleBack = () => {
    router.push('/create/media');
  };

  // Desktop redirect - preserve existing behavior
  if (!isMobile) {
    router.push('/profile');
    return <div className="flex h-screen w-full items-center justify-center">{t('create.category.redirecting')}</div>;
  }

  return (
    <Layout>
      <PageHeader
        title="Kategorie auswählen"
        variant="back-and-title"
        onBack={handleBack}
      />

      <PageContent 
        className={cn(
          !isMobile && 'max-w-[960px] mx-auto px-6 md:px-8'
        )}
        maxWidth="full"
        paddingX={isMobile ? 'px-6' : 'px-0'}
      >
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8">
          
          {/* Search Input */}
          <div className="flex w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <Icon className="h-5 w-5 text-[#999999] mr-3" icon="lucide:search" />
            <input
              className="flex-1 border-none bg-transparent text-[15px] font-medium leading-[18px] text-[#272727] focus:outline-none"
              placeholder={t('create.category.searchPlaceholder')}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Categories List */}
          <div className="flex w-full flex-col gap-3">
            {categoriesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon className="h-8 w-8 text-gray-400 animate-spin" icon="lucide:loader-2" />
              </div>
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <button
                  key={category.category_id}
                  className={`flex w-full flex-col items-start rounded-xl p-4 text-left transition-all duration-200 ${
                    formData.socialCategory === category.category_id
                      ? 'bg-primary-light border border-primary'
                      : 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => updateFormData({ socialCategory: category.category_id })}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-sm font-medium text-[#232323]">
                        {category.name_de || category.name_en}
                      </span>
                    </div>
                    {formData.socialCategory === category.category_id && (
                      <Icon className="h-5 w-5 text-primary" icon="lucide:check" />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Icon className="h-12 w-12 text-gray-300 mb-4" icon="lucide:search-x" />
                <p className="text-sm text-gray-500">
                  {t('create.category.noResults')}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Save Button */}
          {!isMobile && (
            <div className="flex flex-col gap-3 pt-4">
              <Button
                fullWidth
                disabled={!formData.socialCategory}
                icon="lucide:save"
                variant="primary"
                onClick={handleSave}
              >
                {t('actions.save')}
              </Button>
            </div>
          )}
        </div>
      </PageContent>

      {/* Mobile Footer Action */}
      {isMobile && (
        <FooterAction
          actionButton={{
            label: t('actions.save'),
            icon: 'lucide:save',
            onClick: handleSave,
            disabled: !formData.socialCategory,
            variant: 'primary',
          }}
        />
      )}
    </Layout>
  );
}
