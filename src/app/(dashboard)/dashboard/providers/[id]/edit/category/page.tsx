'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { getProviderCategories, PROVIDER_CATEGORY_SECTION_SCOPES } from '@/services/categories';
import { useLanguage } from '@/providers/LanguageProvider';
import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: providerId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      try {
        // Try to read listing_type from localStorage
        let listingType: 'food' | 'store' | undefined;
        try {
          const stored = localStorage.getItem(`admin_edit_inline_${providerId}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.listingType === 'food' || parsed.listingType === 'store') {
              listingType = parsed.listingType;
            }
          }
        } catch {
          // Ignore malformed draft payloads from localStorage.
        }
        const categoriesData = await getProviderCategories(listingType);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
        const { data, error: fallbackError } = await supabase
          .from('categories')
          .select('*')
          .in('applicable_section', [...PROVIDER_CATEGORY_SECTION_SCOPES])
          .order('name_de', { ascending: true });
        if (!fallbackError && data) {
          setCategories(data);
        }
      }
      setCategoriesLoading(false);
    }
    void fetchCategories();
  }, [providerId]);

  useEffect(() => {
    const loadCurrentCategory = async () => {
      try {
        const stored = localStorage.getItem(`admin_edit_category_${providerId}`);
        if (stored) {
          setSelectedCategoryId(stored);
          return;
        }

        const { data, error } = await supabase
          .from('providers')
          .select('category_id')
          .eq('provider_id', providerId)
          .single();

        if (!error && data?.category_id) {
          setSelectedCategoryId(data.category_id);
        }
      } catch (error) {
        console.error('Error loading current category:', error);
      }
    };

    void loadCurrentCategory();
  }, [providerId]);

  const filteredCategories = categories.filter((category) => {
    const categoryName = language === 'en' ? (category.name_en || category.name_de || '') : (category.name_de || category.name_en || '');
    return categoryName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    localStorage.setItem(`admin_edit_category_${providerId}`, categoryId);
    router.back();
  };

  return (
    <div className="h-screen-fix flex flex-col">
      <div className="md:hidden">
        <PageHeader title={t('editProvider.editCategory.title')} variant="back-and-title" onBack={() => router.back()} />
        <HeaderSpacer />
      </div>
      <main className="flex flex-1 flex-col px-6 pb-4 overflow-y-auto md:pt-[var(--desktop-header-height,153px)]">
        <div className="w-full sm:mx-auto sm:max-w-2xl">
          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('editProvider.editCategory.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            {categoriesLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('editProvider.editCategory.loading')}</span>
              </div>
            ) : (
              filteredCategories.map((category) => {
                let categoryName = '';
                if (language === 'en') {
                  categoryName = category.name_en || category.name_de || '';
                } else if (language === 'de') {
                  categoryName = category.name_de || category.name_en || '';
                } else {
                  categoryName = category.name_en || category.name_de || '';
                }
                return (
                  <button
                    key={category.category_id}
                    className={`w-full rounded-xl px-4 py-2 text-left transition-all duration-200 ${
                      selectedCategoryId === category.category_id
                        ? 'bg-primary-light text-content-heading border border-primary'
                        : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => handleCategorySelect(category.category_id)}
                  >
                    <span className="text-sm font-medium">
                      {categoryName}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
