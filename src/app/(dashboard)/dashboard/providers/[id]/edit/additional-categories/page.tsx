'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { getSecondaryCategoryOptions } from '@/services/categories';
import { useLanguage } from '@/providers/LanguageProvider';
import { EditSubPageLayout } from '@/components/layout/EditSubPageLayout';

const MAX_SECONDARY_CATEGORIES = 4;

/**
 * #254: Secondary Category picker (admin route). Same multi-select as the
 * owner variant, namespaced under the `admin_` localStorage draft prefix
 * so it never mixes with owner drafts.
 */
export default function AdminEditAdditionalCategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: providerId } = use(params);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [capHit, setCapHit] = useState(false);
  // 'loading' | 'ok' | 'no-primary' | 'all-section'
  const [primaryState, setPrimaryState] = useState<'loading' | 'ok' | 'no-primary' | 'all-section'>(
    'loading',
  );
  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    const load = async () => {
      setCategoriesLoading(true);
      try {
        // Primary draft written by the category sub-page wins over the DB row.
        let primaryId = localStorage.getItem(`admin_edit_category_${providerId}`) || '';
        if (!primaryId) {
          const { data, error } = await supabase
            .from('providers')
            .select('category_id')
            .eq('provider_id', providerId)
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
        const options = await getSecondaryCategoryOptions(primaryId);
        setCategories(options);

        const draft = localStorage.getItem(`admin_edit_additional_categories_${providerId}`);
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
            .eq('provider_id', providerId);
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
  }, [providerId]);

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
        return prev.filter((id) => id !== categoryId);
      }
      if (prev.length >= MAX_SECONDARY_CATEGORIES) {
        // Cap mirrors the junction check trigger — refuse with a message.
        setCapHit(true);
        return prev;
      }
      return [...prev, categoryId];
    });
  };

  const handleSave = () => {
    localStorage.setItem(
      `admin_edit_additional_categories_${providerId}`,
      JSON.stringify(selectedIds),
    );
    router.back();
  };

  return (
    <EditSubPageLayout
      primaryButton={{
        label: t('editProvider.editAdditionalCategories.save'),
        icon: 'material-symbols:save-outline',
        onClick: handleSave,
      }}
      title={t('editProvider.editAdditionalCategories.title')}
    >
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
    </EditSubPageLayout>
  );
}
