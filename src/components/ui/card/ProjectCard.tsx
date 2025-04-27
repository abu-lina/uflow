import { Globe, Phone, TwitterIcon as TikTok, Instagram, Heart } from 'lucide-react';

import Placeholder from './Placeholder';

export default function ProjectCard() {
  return (
    <div className="border-gray-light overflow-hidden rounded-lg border">
      <div className="relative">
        <div className="bg-gray-light flex h-48 w-full items-center justify-center">
          <Placeholder height={150} width={200} />
        </div>
        <button className="absolute right-2 top-2 rounded-full bg-white p-1">
          <Heart className="h-5 w-5 text-[#7A7A7A]" />
        </button>
        <div className="absolute bottom-2 left-2 rounded-md bg-white px-2 py-1 text-[12px] font-semibold text-[#232323]">
          Zakat
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-[24px] font-semibold text-[#232323]">Wüstenkind e.V.</h3>
        <p className="text-[16px] text-[#7A7A7A]">Helfen spüren</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="bg-gray-light rounded-full bg-opacity-30 px-2 py-0.5 text-[12px] text-[#232323]">
            Waisen
          </span>
          <span className="bg-gray-light rounded-full bg-opacity-30 px-2 py-0.5 text-[12px] text-[#232323]">
            Bangladesch
          </span>
          <span className="bg-gray-light rounded-full bg-opacity-30 px-2 py-0.5 text-[12px] text-[#232323]">
            Afghanistan
          </span>
          <button className="bg-gray-light rounded-full bg-opacity-30 px-2 py-0.5 text-[12px] text-[#232323]">
            +
          </button>
        </div>
        <div className="mt-4 flex justify-between">
          <button className="p-1">
            <Globe className="h-5 w-5 text-[#7A7A7A]" />
          </button>
          <button className="p-1">
            <Phone className="h-5 w-5 text-[#7A7A7A]" />
          </button>
          <button className="p-1">
            <TikTok className="h-5 w-5 text-[#7A7A7A]" />
          </button>
          <button className="p-1">
            <Instagram className="h-5 w-5 text-[#7A7A7A]" />
          </button>
        </div>
      </div>
    </div>
  );
}
