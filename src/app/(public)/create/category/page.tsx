'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Icon } from '@iconify/react';

import { useAuth } from '@/providers/auth-provider';
import type { Category } from '@/types/supabase';
import { supabase } from '@/lib/supabase/client';

export default function SelectCategoryPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name_de', { ascending: true });
      if (!error && data) {
        setCategories(data);
      }
      setCategoriesLoading(false);
    }
    void fetchCategories();
  }, []);

  // Get initial selected category from URL params
  useEffect(() => {
    const categoryId = searchParams.get('categoryId');
    if (categoryId) {
      setSelectedCategory(categoryId);
    }
  }, [searchParams]);

  // Scroll detection for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.querySelector('.content-scroll-container');
      if (!scrollContainer) return;
      
      const currentScrollY = scrollContainer.scrollTop;
      const scrollDifference = currentScrollY - lastScrollY.current;
      
      // Always show if at top
      if (currentScrollY <= 100) {
        setIsHeaderSticky(true);
      }
      // Show when scrolling up past 100px
      else if (currentScrollY > 100 && scrollDifference < 0) {
        setIsHeaderSticky(true);
      }
      // Hide when scrolling down past 100px
      else if (currentScrollY > 100 && scrollDifference > 0) {
        setIsHeaderSticky(false);
      }
      
      lastScrollY.current = currentScrollY;
    };
    
    const scrollContainer = document.querySelector('.content-scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isHeaderSticky]);

  if (!checked || isLoading) {
    return <div className="p-8 text-center">Lädt...</div>;
  }

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          Bitte nutze die Mobile-Ansicht für die Kategorieauswahl.
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <span className="text-center text-lg text-gray-500">
          Du musst angemeldet sein, um eine Kategorie auszuwählen.
        </span>
        <button
          className="rounded-xl bg-mint px-4 py-2 font-semibold text-white"
          onClick={() => router.push('/signin')}
        >
          Zur Anmeldung
        </button>
      </div>
    );
  }

  const filteredCategories = categories.filter(category =>
    category.name_de?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    if (selectedCategory) {
      const params = new URLSearchParams();
      
      // Preserve all existing form data from URL
      const existingParams = ['title', 'description', 'street', 'zip', 'city', 'website', 'instagram', 'phone', 'email', 'offersId', 'needsId'];
      existingParams.forEach(param => {
        const value = searchParams?.get(param);
        if (value) params.set(param, value);
      });
      
      // Add the selected category
      params.set('categoryId', selectedCategory);
      
      router.push(`/create?${params.toString()}`);
    }
  };

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
            onClick={() => {
              const params = new URLSearchParams();
              // Preserve all existing form data
              const formParams = ['title', 'description', 'street', 'zip', 'city', 'country', 'showAddress', 'website', 'instagram', 'phone', 'email', 'offersIds', 'needsIds'];
              formParams.forEach(param => {
                const value = searchParams.get(param);
                if (value) params.set(param, value);
              });
              // Preserve the currently selected category or the original category
              if (selectedCategory) {
                params.set('categoryId', selectedCategory);
              } else {
                // Preserve original category from URL if no new selection
                const originalCategory = searchParams.get('categoryId');
                if (originalCategory) {
                  params.set('categoryId', originalCategory);
                }
              }
              // Add current images count
              params.set('images', searchParams.get('images') || '0');
              router.push(`/create?${params.toString()}`);
            }}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-[#232323] leading-[29px]">
              Kategorie auswählen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 pb-8 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8 pb-mobile-nav-md">
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <div className="flex h-[40px] w-full items-center rounded-2xl bg-white px-[10px] py-[5px] border-0">
              <div className="flex items-center gap-3">
                <Icon className="size-6 shrink-0 text-[#1B1D1D]" icon="lucide:search" />
                <input
                  className="text-xs font-normal text-[#7C7C7C] leading-[15px] outline-none placeholder:text-[#7C7C7C] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent pl-0"
                  placeholder="Kategorien durchsuchen"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="w-full">
              <p className="text-sm font-normal text-[#7A7A7A] leading-[17px]">
                Suche eine passende Kategorie aus, um leichter gefunden zu werden - inshaAllah.
              </p>
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
                    selectedCategory === category.category_id
                      ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedCategory(category.category_id)}
                >
                  <span className="text-sm font-medium">
                    {category.name_de || category.name_en}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
        <div className="flex h-[80px] w-full items-center justify-center px-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-1 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              !selectedCategory 
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed' 
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={!selectedCategory}
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
