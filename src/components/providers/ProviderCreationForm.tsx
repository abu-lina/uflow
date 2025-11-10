import { useState } from 'react';

import { Icon } from '@iconify/react';

import type { ProviderFormData } from '@/types/provider';

interface ProviderCreationFormProps {
  onSubmit: (formData: ProviderFormData) => void;
}

export function ProviderCreationForm({ onSubmit }: ProviderCreationFormProps) {
  const [formData, setFormData] = useState<ProviderFormData>({
    title: '',
    category: '',
    description: '',
    street: '',
    zip: '',
    city: '',
    country: '',
    showAddress: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      className="hide-scrollbar flex h-[685px] w-[640px] flex-col items-end gap-4 overflow-y-auto"
      onSubmit={handleSubmit}
    >
      {/* Info Text */}
      <div className="text-center font-inter text-base text-[#555]">
        Fülle alle relevanten Informationen aus.
      </div>
      {/* Form Fields */}
      <div className="flex w-full flex-col items-start gap-4">
        {/* Titel section is first and has scroll margin top for anchor/scrolling */}
        <div className="flex w-full scroll-mt-8 flex-col items-start gap-2">
          <div className="font-inter text-base text-[#999]">TITEL</div>
          <input
            aria-label="Titel des Providers oder Services"
            autoComplete="off"
            className="w-full rounded-[15px] border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2 font-inter-tight text-base text-content-heading transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            id="provider-title"
            name="title"
            placeholder="Titel eingeben"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        {/* Category Field */}
        <div className="flex w-full flex-col items-start gap-2">
          <div className="font-inter text-base text-[#999]">KATEGORIE</div>
          <div className="flex h-10 w-full flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
            <span className="font-inter text-[15px] font-medium text-[#272727]">
              Kategorie wählen
            </span>
            <Icon className="size-6" icon="line-md:chevron-down" />
          </div>
        </div>
        {/* Description Field */}
        <div className="flex w-full flex-col items-start gap-2">
          <div className="font-inter text-base text-[#999]">BESCHREIBUNG</div>
          <textarea
            className="h-[160px] w-full rounded-[15px] border border-[#D4D4D4] p-[12px] font-inter text-base"
            placeholder="Beschreibung eingeben"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        {/* Street Field */}
        <div className="flex w-full flex-col items-start gap-2">
          <div className="font-inter text-base text-[#999]">STRASSE</div>
          <div className="flex h-10 w-full flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
            <span className="font-inter text-[15px] font-medium text-[#272727]">
              Straße eingeben
            </span>
            <Icon className="size-6" icon="ic:baseline-edit" />
          </div>
        </div>
        {/* Zip Field */}
        <div className="flex w-full flex-col items-start gap-2">
          <div className="font-inter text-base text-[#999]">POSTLEITZAHL</div>
          <div className="flex h-10 w-full flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
            <span className="font-inter text-[15px] font-medium text-[#272727]">PLZ eingeben</span>
            <Icon className="size-6" icon="ic:baseline-edit" />
          </div>
        </div>
        {/* City Field */}
        <div className="flex w-full flex-col items-start gap-2">
          <div className="font-inter text-base text-[#999]">STADT</div>
          <div className="flex h-10 w-full flex-row items-center justify-between gap-[17px] rounded-[15px] border border-[#D4D4D4] bg-white px-[17px]">
            <span className="font-inter text-[15px] font-medium text-[#272727]">
              Stadt eingeben
            </span>
            <Icon className="size-6" icon="ic:baseline-edit" />
          </div>
        </div>
      </div>
      {/* Action Button */}
      <button
        className="flex h-8 w-[106.8px] flex-row items-center justify-center gap-[4.8px] rounded-[9.6px] bg-[#CDCDCD] px-4"
        type="submit"
      >
        <Icon className="size-4" icon="mynaui:send" />
        <span className="font-inter-tight text-base font-medium text-[#272727]">Senden</span>
      </button>
    </form>
  );
}
