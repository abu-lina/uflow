'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { getSecondaryCategoryOptions } from '@/services/categories';
import { useLanguage } from '@/providers/LanguageProvider';

const MAX_SECONDARY_CATEGORIES = 4;

/**
 * #254: Secondary Category picker (owner route). Multi-select counterpart
 * to edit/category: options are scoped to the Primary Category's section,
 * capped at 4, persisted as a JSON-array draft under
 * `edit_additional_categories_{id}` for ProviderEditForm to pick up.
 */
export default function EditAdditionalCategoriesPage({
  params,
}: {
  params: Promise<{ provider_id: string }>;
}) {
  const resolvedParams = use(params);
  const pid = resolvedParams.provider_id;
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [capHit, setCapHit] = useState(false);
  // The resolved Primary this draft is scoped to — written alongside the
  // draft so ProviderEditForm can tell a draft picked under the NEW primary
  // from a stale one picked under the old (reverse visit order fix).
  const [draftPrimaryId, setDraftPrimaryId] = useState('');
  // 'loading' | 'ok' | 'no-primary' | 'all-section'
  const [primaryState, setPrimaryState] = useState<'loading' | 'ok' | 'no-primary' | 'all-section'>(
    'loading',
  );
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
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

  // Resolve the Primary Category: an unsaved draft selection wins over the
  // stored provider row, mirroring how the form reads drafts on return.
  useEffect(() => {
    const load = async () => {
      setCategoriesLoading(true);
      try {
        let primaryId = localStorage.getItem(`edit_category_${pid}`) || '';
        if (!primaryId) {
          const { data, error } = await supabase
            .from('providers')
            .select('category_id')
            .eq('provider_id', pid)
            .single();
          if (!error && data?.category_id) primaryId = data.category_id;
        }

        if (!primaryId) {
          setPrimaryState('no-primary');
          return;
        }

        const { data: primary } = await supabase
          .from('categories')
          .select('applicable_section')
          .eq('category_id', primaryId)
          .maybeSingle();

        if (!primary || primary.applicable_section === 'all') {
          setPrimaryState('all-section');
          return;
        }

        setPrimaryState('ok');
        setDraftPrimaryId(primaryId);
        const options = await getSecondaryCategoryOptions(primaryId);
        setCategories(options);

        // Initial selection: draft wins, else the junction rows minus primary.
        const draft = localStorage.getItem(`edit_additional_categories_${pid}`);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            if (Array.isArray(parsed)) setSelectedIds(parsed);
          } catch {
            /* ignore malformed draft */
          }
        } else {
          const { data: junction } = await supabase
            .from('provider_categories')
            .select('category_id')
            .eq('provider_id', pid);
          if (junction) {
            setSelectedIds(
              junction
                .map((r: { category_id: string }) => r.category_id)
                .filter((id: string) => id !== primaryId),
            );
          }
        }
      } catch (error) {
        console.error('Error loading additional categories:', error);
        setPrimaryState('no-primary');
      } finally {
        setCategoriesLoading(false);
      }
    };

    void load();
  }, [pid]);

  // Scroll detection for sticky header
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
    const categoryName =
      language === 'en'
        ? category.name_en || category.name_de || ''
        : category.name_de || category.name_en || '';
    return categoryName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleCategory = (categoryId: string) => {
    setCapHit(false);
    setSelectedIds((prev) => {
      if (prev.includes(categoryId)) {
        const next = prev.filter((id) => id !== categoryId);
        localStorage.setItem(`edit_additional_categories_${pid}`, JSON.stringify(next));
        localStorage.setItem(`edit_additional_categories_for_${pid}`, draftPrimaryId);
        return next;
      }
      if (prev.length >= MAX_SECONDARY_CATEGORIES) {
        // Cap mirrors the junction check trigger — refuse with a message
        // rather than letting a raw 23514 reach the user at save time.
        setCapHit(true);
        return prev;
      }
      const next = [...prev, categoryId];
      localStorage.setItem(`edit_additional_categories_${pid}`, JSON.stringify(next));
      localStorage.setItem(`edit_additional_categories_for_${pid}`, draftPrimaryId);
      return next;
    });
  };

  if (!checked) return null;

  if (!isMobile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold text-content-heading">
            {t('editProvider.editCategory.desktopTitle')}
          </h1>
          <p className="text-gray-600">{t('editProvider.editCategory.desktopMessage')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen-fix flex flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-0 z-50 bg-white/10 pt-[calc(env(safe-area-inset-top)+24px)] backdrop-blur-3xl transition-all duration-500 ease-in-out ${
          isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="mx-auto flex h-10 w-full max-w-[393px] items-start pl-7 pr-4">
          <button
            aria-label={t('editProvider.back')}
            className="-ml-1 flex h-8 w-8 items-center justify-center"
            onClick={() => router.back()}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-heading">
            {t('editProvider.editAdditionalCategories.title')}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[393px] px-4 pb-safe-bottom pt-[calc(env(safe-area-inset-top)+24px+40px+24px)]">
          {primaryState === 'no-primary' || primaryState === 'all-section' ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center">
              <p className="text-sm text-gray-600">
                {primaryState === 'no-primary'
                  ? t('editProvider.editAdditionalCategories.emptyNoPrimary')
                  : t('editProvider.editAdditionalCategories.emptyForAllSection')}
              </p>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Icon
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    icon="lucide:search"
                  />
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder={t('editProvider.editAdditionalCategories.searchPlaceholder')}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {capHit && (
                <p className="mb-3 text-sm text-danger">
                  {t('editProvider.editAdditionalCategories.maxSelected')}
                </p>
              )}

              {/* Categories List — multi-select with checkmarks */}
              <div className="flex-1 space-y-2">
                {categoriesLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <span className="text-gray-500">
                      {t('editProvider.editAdditionalCategories.loading')}
                    </span>
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
                    const selected = selectedIds.includes(category.category_id);
                    return (
                      <button
                        key={category.category_id}
                        className={`flex w-full items-center justify-between rounded-xl px-4 py-2 text-left transition-all duration-200 ${
                          selected
                            ? 'border border-primary bg-primary-light text-content-heading'
                            : 'border border-gray-200 bg-white text-[#232323] hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => toggleCategory(category.category_id)}
                      >
                        <span className="text-sm font-medium">{categoryName}</span>
                        {selected && (
                          <Icon className="h-5 w-5 text-primary" icon="material-symbols:check" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
