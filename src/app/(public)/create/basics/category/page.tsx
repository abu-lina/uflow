'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Icon } from '@iconify/react';

import type { Category } from '@/types/supabase';
import { FormInput } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { useFormData } from '@/providers/form-provider';
import { getCategories } from '@/services/categories';
import { shouldCreateCommunityService } from '@/utils/categoryUtils';
import { useLanguage } from '@/providers/LanguageProvider';

export default function SelectCategoryPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);
  const router = useRouter();
  const { formData, updateFormData } = useFormData();
  const { t } = useLanguage();

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
        // Get all categories so users can choose to create either providers or community services
        const categoriesData = await getCategories();
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


  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const scrollContainer = scrollContainerRef.current;
      
      if (!scrollContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = scrollContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = scrollContainer.scrollHeight;
            const clientHeight = scrollContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);

  if (!checked) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  if (!isMobile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-lg text-gray-500">
          {t('create.category.desktopMessage')}
        </span>
      </div>
    );
  }


  const filteredCategories = categories.filter(category =>
    category.name_de?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    if (formData.category) {
      router.push('/create/basics');
    }
  };

  return (
    <div className="relative flex h-screen w-full max-w-[393px] flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      {/* Single Sticky Header */}
      <div className={`fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-safe-top transition-all duration-500 ease-in-out ${
        isHeaderSticky ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}>
        <div className="flex h-16 w-full max-w-[393px] mx-auto items-center px-4 pt-2">
          {/* Back Button */}
          <button
            className="flex h-8 w-8 items-center justify-center"
            onClick={() => router.push('/create/basics')}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-start">
            <h1 className="text-xl font-semibold text-title leading-[29px]">
              {t('create.category.selectCategory')}
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8">
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <FormInput
              containerClassName="h-[40px] py-0"
              inputClassName="text-xs font-normal text-[#7C7C7C] leading-[15px] placeholder:text-[#7C7C7C] h-full"
              label=""
              labelClassName="hidden"
              placeholder={t('create.category.searchCategories')}
              rightIcon={<Icon className="h-6 w-6 text-[#1B1D1D]" icon="material-symbols:search" />}
              type="text"
              value={searchQuery}
              variant="with-icon"
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Subtitle */}
            <div className="w-full">
              <p className="text-sm font-normal text-[#7A7A7A] leading-[17px]">
                {t('create.category.searchDescription')}
              </p>
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 space-y-2">
            {categoriesLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">{t('create.category.loadingCategories')}</span>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <button
                  key={category.category_id}
                  className={`w-full rounded-xl px-4 py-2 text-left transition-all duration-200 ${
                    formData.category === category.category_id
                      ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={async () => {
                    const categoryId = category.category_id;
                    const isCommunityService = await shouldCreateCommunityService(categoryId);
                    console.log('Category selected:', category.name_de, 'ID:', categoryId);
                    console.log('Should create community service:', isCommunityService);
                    updateFormData({ 
                      category: categoryId,
                      entityType: isCommunityService ? 'community_service' : 'provider'
                    });
                    console.log('Updated formData entityType to:', isCommunityService ? 'community_service' : 'provider');
                    
                    // Also log the current form data to verify it's being updated
                    setTimeout(() => {
                      console.log('Form data after update:', { category: categoryId, entityType: isCommunityService ? 'community_service' : 'provider' });
                    }, 100);
                  }}
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
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]" 
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-[80px] w-full items-center justify-center px-4 pb-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-1 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              !formData.category 
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed' 
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={!formData.category}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              {t('actions.save')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
