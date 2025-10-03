'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Need } from '@/types/offer';

export default function SelectNeedsPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newNeed, setNewNeed] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const lastScrollY = useRef(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Load selected needs from URL params
  useEffect(() => {
    const selected = searchParams.get('needsIds');
    if (selected) {
      try {
        setSelectedNeeds(JSON.parse(selected));
      } catch (error) {
        console.error('Error parsing selected needs:', error);
      }
    }
  }, [searchParams]);

  // Scroll detection for sticky header
  useEffect(() => {
    const contentContainer = document.querySelector('.content-scroll-container');
    
    const handleScroll = () => {
      const currentScrollY = contentContainer?.scrollTop || 0;
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

    if (contentContainer) {
      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => contentContainer.removeEventListener('scroll', handleScroll);
    }
  }, [isHeaderSticky]);

  // Filter needs based on search query
  const filteredNeeds = needs.filter(need =>
    need.name_de.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle need selection (multi-selection)
  const toggleNeed = (needId: string) => {
    setSelectedNeeds(prev => 
      prev.includes(needId)
        ? prev.filter(id => id !== needId)
        : [...prev, needId]
    );
  };

  // Create new need
  const createNeed = async () => {
    if (!newNeed.trim()) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('needs')
        .insert([{ name_de: newNeed.trim() }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating need:', error);
      } else if (data) {
        setNeeds(prev => [...prev, data]);
        setSelectedNeeds(prev => [...prev, data.need_id]);
        setNewNeed('');
      }
    } catch (error) {
      console.error('Error creating need:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Save selected needs and return to create page with all form data preserved
  const handleSave = () => {
    if (selectedNeeds.length > 0) {
      const params = new URLSearchParams();
      
      // Preserve all existing form data from URL
      const existingParams = ['title', 'description', 'street', 'zip', 'city', 'website', 'instagram', 'phone', 'email', 'categoryId', 'offersIds'];
      existingParams.forEach(param => {
        const value = searchParams?.get(param);
        if (value) params.set(param, value);
      });
      
      // Add the selected needs
      params.set('needsIds', JSON.stringify(selectedNeeds));
      
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
            onClick={() => router.push('/create')}
          >
            <Icon className="h-8 w-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          
          {/* Title */}
          <div className="flex flex-1 items-center justify-start">
            <h1 className="text-xl font-semibold text-[#232323] leading-[29px]">
              Bedürfnisse auswählen
            </h1>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump */}
      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-16' : 'h-0'
      }`} />

      {/* Content */}
      <div className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-16 pb-10 overflow-y-auto">
        <div className="flex w-full max-w-[361px] flex-1 flex-col gap-8 pb-24">
          {/* Search Bar + Subtitle */}
          <div className="flex w-full flex-col gap-2">
            {/* Search Bar */}
            <div className="flex h-[40px] w-full items-center rounded-[15px] bg-white px-[10px] py-[5px] border-0">
              <div className="flex items-center gap-[15px]">
                <Icon className="h-6 w-6 text-[#232323]" icon="material-symbols:search" />
                <input
                  className="text-xs font-normal text-[#7C7C7C] leading-[15px] outline-none placeholder:text-[#7C7C7C] border-0 focus:border-0 focus:ring-0 focus:outline-none bg-transparent"
                  placeholder="Bedürfnisse durchsuchen"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Subtitle */}
            <div className="w-full">
              <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
                Wähle deine Bedürfnisse aus oder erstelle neue, um dein Profil zu vervollständigen.
              </p>
            </div>
          </div>

          {/* Create New Need */}
          <div className="flex w-full flex-col gap-2">
            <h3 className="text-sm font-medium text-[#232323]">Neues Bedürfnis erstellen</h3>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#589D96] focus:outline-none"
                placeholder="Bedürfnis eingeben..."
                type="text"
                value={newNeed}
                onChange={(e) => setNewNeed(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createNeed()}
              />
              <button
                className="rounded-lg bg-[#589D96] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={!newNeed.trim() || isCreating}
                onClick={createNeed}
              >
                {isCreating ? '...' : 'Hinzufügen'}
              </button>
            </div>
          </div>

          {/* Needs List */}
          <div className="flex-1 w-full">
            <h3 className="mb-4 text-sm font-medium text-[#232323]">Verfügbare Bedürfnisse</h3>
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <span className="text-gray-500">Lade Bedürfnisse...</span>
                </div>
              ) : (
                filteredNeeds.map((need) => (
                  <button
                    key={need.need_id}
                    className={`w-full rounded-full px-4 py-2 text-left transition-all duration-200 ${
                      selectedNeeds.includes(need.need_id)
                        ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                        : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                    onClick={() => toggleNeed(need.need_id)}
                  >
                    <span className="text-sm font-medium">
                      {need.name_de}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-[12px]">
        <div className="flex h-[80px] w-full items-center justify-center px-4">
          <button
            className={`flex h-[48px] w-full max-w-[345px] items-center justify-center gap-2 rounded-xl px-5 shadow-[0px_8px_24px_rgba(88,157,150,0.25)] transition-opacity ${
              selectedNeeds.length === 0
                ? 'bg-[#589D96] opacity-30 cursor-not-allowed'
                : 'bg-[#589D96] opacity-100'
            }`}
            disabled={selectedNeeds.length === 0}
            onClick={handleSave}
          >
            <Icon className="h-6 w-6 text-white" icon="lucide:save" />
            <span className="text-base font-medium text-white leading-[19px]">
              Speichern ({selectedNeeds.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
