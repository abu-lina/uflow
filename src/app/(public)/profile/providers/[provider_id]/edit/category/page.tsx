'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { getProviderCategories } from '@/services/categories';

export default function EditCategoryPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();

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
        const categoriesData = await getProviderCategories();
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

  // Load current category from provider data and localStorage
  useEffect(() => {
    const loadCurrentCategory = async () => {
      try {
        // First check localStorage for any pending selection
        const stored = localStorage.getItem(`edit_category_${resolvedParams.provider_id}`);
        if (stored) {
          setSelectedCategoryId(stored);
          return;
        }

        // If no localStorage value, fetch current provider category
        const { data, error } = await supabase
          .from('providers')
          .select('category_id')
          .eq('provider_id', resolvedParams.provider_id)
          .single();

        if (!error && data?.category_id) {
          setSelectedCategoryId(data.category_id);
        }
      } catch (error) {
        console.error('Error loading current category:', error);
      }
    };

    void loadCurrentCategory();
  }, [resolvedParams.provider_id]);

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

  const filteredCategories = categories.filter((category) =>
    category.name_de?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    localStorage.setItem(`edit_category_${resolvedParams.provider_id}`, categoryId);
    router.back();
  };

  if (!checked) return null;

  if (!isMobile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-semibold text-gray-900">Desktop Version</h1>
          <p className="text-gray-600">
            Diese Seite ist für mobile Geräte optimiert. Bitte öffnen Sie sie auf einem Mobilgerät.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)] transition-all duration-500 ease-in-out ${
          isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-title">Kategorie wählen</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px+40px+16px)] pb-safe-bottom">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-[#589D96] focus:outline-none focus:ring-1 focus:ring-[#589D96]"
                placeholder="Kategorien durchsuchen..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 space-y-2">
            {categoriesLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">Lade Kategorien...</span>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.category_id}
                  className={`w-full rounded-xl px-4 py-2 text-left transition-all duration-200 ${
                    selectedCategoryId === category.category_id
                      ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => handleCategorySelect(category.category_id)}
                >
                  <span className="text-sm font-medium">
                    {category.name_de || category.name_en}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
