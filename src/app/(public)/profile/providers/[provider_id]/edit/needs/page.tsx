'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { supabase } from '@/lib/supabase/client';
import type { Need } from '@/types/offer';

export default function EditNeedsPage({ params }: { params: Promise<{ provider_id: string }> }) {
  const resolvedParams = use(params);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNeedIds, setSelectedNeedIds] = useState<string[]>([]);
  const [newNeed, setNewNeed] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

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
          .select('needs_ids')
          .eq('provider_id', resolvedParams.provider_id)
          .single();

        if (!error && data?.needs_ids) {
          setSelectedNeedIds(data.needs_ids);
        }
      } catch (error) {
        console.error('Error loading current needs:', error);
      }
    };

    void loadCurrentNeeds();
  }, [resolvedParams.provider_id]);

  const filteredNeeds = needs.filter((need) =>
    need.name_de?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      const { data, error } = await supabase
        .from('needs')
        .insert([{ name_de: newNeed.trim() }])
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
    <div className="flex h-screen flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/10 backdrop-blur-3xl pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="flex items-start w-full max-w-[393px] mx-auto pl-7 pr-4 h-10">
          <button
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
            onClick={() => router.back()}
          >
            <Icon className="w-8 h-8 text-[#272727]" icon="material-symbols:chevron-left" />
          </button>
          <h1 className="text-xl font-semibold text-content-title">Was suche ich?</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-[393px] mx-auto px-4 pt-[calc(env(safe-area-inset-top)+24px+40px+16px)] pb-24">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Icon
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                icon="lucide:search"
              />
              <input
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-[#589D96] focus:outline-none focus:ring-1 focus:ring-[#589D96]"
                placeholder="Bedürfnisse durchsuchen..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Subtitle */}
          <div className="mb-4">
            <p className="text-sm font-normal leading-[17px] text-[#7A7A7A]">
              Wähle deine Bedürfnisse aus oder erstelle neue, um passende Angebote zu erhalten - inshaAllah.
            </p>
          </div>

          {/* Create New Need */}
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-[#232323]">Neues Bedürfnis erstellen</h3>
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
          <div className="mb-4">
            <h3 className="mb-4 text-sm font-medium text-[#232323]">Verfügbare Bedürfnisse</h3>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <span className="text-gray-500">Lade Bedürfnisse...</span>
              </div>
            ) : (
              filteredNeeds.map((need) => (
                <button
                  key={need.need_id}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                    selectedNeedIds.includes(need.need_id)
                      ? 'bg-[#BFDBD8] text-[#232323] border border-[#589D96]'
                      : 'bg-white text-[#232323] border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => toggleNeed(need.need_id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{need.name_de}</span>
                    {selectedNeedIds.includes(need.need_id) && (
                      <Icon className="h-5 w-5 text-[#589D96]" icon="lucide:check" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200/30 px-4 py-4">
        <div className="flex w-full gap-3.5 max-w-[393px] mx-auto">
          <button
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#589D96] text-base font-medium text-white shadow transition hover:bg-[#4a8a84]"
            onClick={handleSave}
          >
            <Icon className="h-5 w-5" icon="lucide:check" />
            {selectedNeedIds.length > 0 ? `${selectedNeedIds.length} ausgewählt` : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
