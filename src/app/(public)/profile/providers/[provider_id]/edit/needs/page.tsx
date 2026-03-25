'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Need } from '@/types/offer';
import { FooterAction } from '@/components/ui/FooterAction';
import { useLanguage } from '@/providers/LanguageProvider';

export default function EditNeedsPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNeedIds, setSelectedNeedIds] = useState<string[]>([]);
  const [providerCategoryId, setProviderCategoryId] = useState<string | null>(null);
  const [newNeed, setNewNeed] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { t, language } = useLanguage();

  // Load needs from database
  useEffect(() => {
    async function fetchNeeds() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('needs')
          .select('*')
          .order('name_de', { ascending: true });
        
        if (error) {
          console.error('Error fetching needs:', error);
        } else if (data) {
          setNeeds(data);
        }
      } catch (error) {
        console.error('Error fetching needs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    void fetchNeeds();
  }, []);

  // Load current selections
  useEffect(() => {
    const loadCurrentNeeds = async () => {
      try {
        // First check localStorage for any pending selection
        const stored = localStorage.getItem(`edit_needs_${resolvedParams.provider_id}`);
        if (stored) {
          setSelectedNeedIds(JSON.parse(stored));
          return;
        }

        // If no localStorage value, fetch current provider needs
        const { data, error } = await supabase
          .from('providers')
          .select('needs_ids, category_id')
          .eq('provider_id', resolvedParams.provider_id)
          .single();

        if (!error && data) {
          if (data.needs_ids) {
            setSelectedNeedIds(data.needs_ids);
          }
          if (data.category_id) {
            setProviderCategoryId(data.category_id);
          }
        }
      } catch (error) {
        console.error('Error loading current needs:', error);
      }
    };

    void loadCurrentNeeds();
  }, [resolvedParams.provider_id]);

  const filteredNeeds = needs.filter((need) => {
    const needName = language === 'en' ? (need.name_en || need.name_de || '') : (need.name_de || need.name_en || '');
    return needName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleNeed = (needId: string) => {
    setSelectedNeedIds(prev => {
      const newSelection = prev.includes(needId)
        ? prev.filter(id => id !== needId)
        : [...prev, needId];
      
      localStorage.setItem(`edit_needs_${resolvedParams.provider_id}`, JSON.stringify(newSelection));
      return newSelection;
    });
  };

  const createNeed = async () => {
    if (!newNeed.trim()) return;
    
    setIsCreating(true);
    try {
      // Migration 006 made category_id NOT NULL; use provider's category or default to 'Sonstiges' (Other)
      const DEFAULT_CATEGORY_ID = '5e5d910d-d790-4184-a061-9cd74d0950e8';
      const effectiveCategoryId = providerCategoryId || DEFAULT_CATEGORY_ID;
      const { data, error } = await supabase
        .from('needs')
        .insert([{ name_de: newNeed.trim(), category_id: effectiveCategoryId }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating need:', error);
      } else if (data) {
        setNeeds(prev => [...prev, data]);
        const newSelection = [...selectedNeedIds, data.need_id];
        setSelectedNeedIds(newSelection);
        localStorage.setItem(`edit_needs_${resolvedParams.provider_id}`, JSON.stringify(newSelection));
        setNewNeed('');
      }
    } catch (error) {
      console.error('Error creating need:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = () => {
    router.back();
  };

  return (
    <div className="flex h-screen-fix flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label={t('editProvider.back')}
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-heading">{t('editProvider.editNeeds.title')}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px+40px+24px)] pb-24">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder={t('editProvider.editNeeds.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="mb-4">
            <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
              {t('editProvider.editNeeds.description')}
            </p>
          </div>

          {/* Create New Need */}
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-[#232323]">{t('editProvider.editNeeds.createNew')}</h3>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder={t('editProvider.editNeeds.needPlaceholder')}
                type="text"
                value={newNeed}
                onChange={(e) => setNewNeed(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createNeed()}
              />
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark active:bg-primary-darker disabled:opacity-50"
                disabled={!newNeed.trim() || isCreating}
                onClick={createNeed}
              >
                {isCreating ? '...' : t('editProvider.editNeeds.add')}
              </button>
            </div>
          </div>

          {/* Needs List */}
          <div className="mb-4">
            <h3 className="mb-4 text-sm font-medium text-[#232323]">{t('editProvider.editNeeds.availableNeeds')}</h3>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('editProvider.editNeeds.loading')}</span>
              </div>
            ) : (
              filteredNeeds.map((need) => (
                <button
                  key={need.need_id}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                    selectedNeedIds.includes(need.need_id)
                      ? 'bg-primary-light text-content-heading border border-primary'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => toggleNeed(need.need_id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {language === 'en' ? (need.name_en || need.name_de || '') : (need.name_de || need.name_en || '')}
                    </span>
                    {selectedNeedIds.includes(need.need_id) && (
                      <Icon className="h-5 w-5 text-primary" icon="lucide:check" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Save Button */}
      <FooterAction
        actionButton={{
          label: selectedNeedIds.length > 0 ? t('editProvider.editNeeds.selected').replace('{{count}}', selectedNeedIds.length.toString()) : t('editProvider.editNeeds.save'),
          icon: 'lucide:check',
          onClick: handleSave,
          variant: 'primary',
          'aria-label': t('editProvider.editNeeds.saveAria'),
        }}
      />
    </div>
  );
}
