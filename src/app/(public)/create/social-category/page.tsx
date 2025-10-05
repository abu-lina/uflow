'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import { getSocialProjectCategories } from '@/services/categories';

export default function SelectSocialCategoryPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const { formData, updateFormData } = useFormData();

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

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY.current && currentScrollY > 100) {
        setIsHeaderSticky(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsHeaderSticky(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHeaderSticky]);

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

  if (!checked) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!isMobile) {
    router.push('/profile');
    return <div className="flex h-screen w-full items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl transition-transform duration-300 ${
        isHeaderSticky ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={handleBack}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-start">
            <h1 className="text-xl font-semibold text-title">
              Kategorie auswählen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-4 pt-8 pb-8 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8 pb-mobile-nav-md">
          
          {/* Search Input */}
          <div className="flex w-full items-center rounded-2xl border border-[#D4D4D4] bg-white px-3 py-2">
            <Icon className="h-5 w-5 text-[#999999] mr-3" icon="lucide:search" />
            <input
              className="flex-1 border-none bg-transparent text-[15px] font-medium leading-[18px] text-[#272727] focus:outline-none"
              placeholder="Kategorie suchen..."
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
                      ? 'bg-[#BFDBD8] border border-[#589D96]'
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
                      <Icon className="h-5 w-5 text-[#589D96]" icon="lucide:check" />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Icon className="h-12 w-12 text-gray-300 mb-4" icon="lucide:search-x" />
                <p className="text-sm text-gray-500">
                  Keine Kategorien gefunden
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
        <div className="flex h-[80px] w-full items-center justify-center px-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              formData.socialCategory
                ? 'bg-[#589D96] opacity-100'
                : 'bg-[#589D96] opacity-30 cursor-not-allowed'
            }`}
            disabled={!formData.socialCategory}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              Speichern
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
