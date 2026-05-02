'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { getProviderCategories, PROVIDER_CATEGORY_SECTION_SCOPES } from '@/services/categories';
import { useLanguage } from '@/providers/LanguageProvider';

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: providerId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchCategories() {
      setCategoriesLoading(true);
      try {
        const categoriesData = await getProviderCategories();
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
  }, []);

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

  useEffect(() => {
    const container = document.querySelector('main');
    scrollContainerRef.current = container;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      if (currentScrollY <= 0) {
        setIsHeaderSticky(true);
      } else if (currentScrollY < lastScrollY.current) {
        setIsHeaderSticky(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderSticky(false);
      }
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="flex h-screen-fix flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      <header
        className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)] transition-all duration-500 ease-in-out ${
          isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label={t('editProvider.back')}
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-heading">{t('editProvider.editCategory.title')}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px+40px+24px)] pb-safe-bottom">
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
