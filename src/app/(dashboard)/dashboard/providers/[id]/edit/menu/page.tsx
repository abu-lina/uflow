'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FooterAction } from '@/components/ui/FooterAction';
import type { AdminProviderMenu } from '@/types/adminProvider';

const DEFAULT_ITEM: AdminProviderMenu = {
  name_de: '',
  price_cents: 0,
  sort_order: 0,
  is_available: true,
};

const CATEGORIES = ['Hauptgerichte', 'Getränke', 'Vorspeisen', 'Desserts'];

export default function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const STORAGE_KEY = `admin_edit_menu_${id}`;

  const [items, setItems] = useState<AdminProviderMenu[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<AdminProviderMenu>({ ...DEFAULT_ITEM });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
          return;
        }
      } catch { /* ignore */ }
    }

    async function fetchItems() {
      try {
        const res = await fetch(`/api/admin/providers/${id}/menu`);
        if (res.ok) {
          const json = await res.json();
          const data = (json.data ?? []) as AdminProviderMenu[];
          setItems(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch { /* ignore */ }
    }
    fetchItems();
  }, [id, STORAGE_KEY]);

  const handleSave = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    router.back();
  }, [items, STORAGE_KEY, router]);

  const updateItem = (index: number, field: string, value: unknown) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    if (!newItem.name_de.trim()) return;
    setItems(prev => [...prev, { ...newItem, sort_order: prev.length }]);
    setNewItem({ ...DEFAULT_ITEM, sort_order: 0 });
    setShowAddForm(false);
  };

  return (
    <div className="flex h-screen-fix flex-col">
      <PageHeader title="Menu" variant="back-and-title" onBack={() => router.back()} />
      <main className="flex flex-1 flex-col px-6 pb-4 pt-24 gap-4 overflow-y-auto">
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm gap-2">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 text-[15px] font-medium text-[#272727] outline-none bg-transparent"
                  placeholder="Name (DE) *"
                  value={item.name_de}
                  onChange={(e) => updateItem(i, 'name_de', e.target.value)}
                />
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-red-50"
                  type="button"
                  onClick={() => removeItem(i)}
                >
                  <Icon className="h-5 w-5 text-red-400" icon="material-symbols:close-rounded" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                  placeholder="Name (EN)"
                  value={item.name_en ?? ''}
                  onChange={(e) => updateItem(i, 'name_en', e.target.value)}
                />
                <input
                  className="w-24 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                  min={0}
                  placeholder="Price (cent)"
                  type="number"
                  value={item.price_cents}
                  onChange={(e) => updateItem(i, 'price_cents', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="flex-1 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                  value={item.category ?? ''}
                  onChange={(e) => updateItem(i, 'category', e.target.value || null)}
                >
                  <option value="">No category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  className="w-16 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                  min={0}
                  placeholder="Sort"
                  type="number"
                  value={item.sort_order}
                  onChange={(e) => updateItem(i, 'sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
              <textarea
                className="text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1 resize-none"
                placeholder="Description (DE)"
                rows={2}
                value={item.description_de ?? ''}
                onChange={(e) => updateItem(i, 'description_de', e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-[#999999]">
                <input
                  checked={item.is_available}
                  type="checkbox"
                  onChange={(e) => updateItem(i, 'is_available', e.target.checked)}
                />
                Available
              </label>
            </div>
          ))}
        </div>

        {showAddForm ? (
          <div className="flex flex-col rounded-2xl border border-[#E5E5E5] bg-white px-3 py-2 shadow-sm gap-2">
            <input
              className="text-[15px] font-medium text-[#272727] outline-none bg-transparent"
              placeholder="Name (DE) *"
              value={newItem.name_de}
              onChange={(e) => setNewItem(prev => ({ ...prev, name_de: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                placeholder="Name (EN)"
                value={newItem.name_en ?? ''}
                onChange={(e) => setNewItem(prev => ({ ...prev, name_en: e.target.value }))}
              />
              <input
                className="w-24 text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
                min={0}
                placeholder="Price (cent)"
                type="number"
                value={newItem.price_cents}
                onChange={(e) => setNewItem(prev => ({ ...prev, price_cents: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <select
              className="text-xs text-[#999999] outline-none bg-transparent border border-[#E5E5E5] rounded-lg px-2 py-1"
              value={newItem.category ?? ''}
              onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value || null }))}
            >
              <option value="">No category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                disabled={!newItem.name_de.trim()}
                type="button"
                onClick={addItem}
              >
                Add
              </button>
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#999999] hover:bg-gray-50"
                type="button"
                onClick={() => { setShowAddForm(false); setNewItem({ ...DEFAULT_ITEM }); }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E5E5E5] bg-white px-3 py-3 shadow-sm hover:bg-gray-50"
            type="button"
            onClick={() => setShowAddForm(true)}
          >
            <Icon className="h-5 w-5 text-[#999999]" icon="material-symbols:add" />
            <span className="text-sm font-medium text-[#999999]">Add menu item</span>
          </button>
        )}
      </main>
      <FooterAction
        primaryButton={{
          label: 'Save',
          icon: 'material-symbols:save-outline',
          onClick: handleSave,
        }}
        secondaryButton={{
          icon: 'material-symbols:close',
          onClick: () => router.back(),
          'aria-label': 'Close',
        }}
      />
    </div>
  );
}
