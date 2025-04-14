import { Globe, Phone, TwitterIcon as TikTok, Instagram, Heart } from "lucide-react";
import Placeholder from "./Placeholder";

export default function ProjectCard() {
  return (
    <div className="border border-gray-light rounded-lg overflow-hidden">
      <div className="relative">
        <div className="w-full h-48 bg-gray-light flex items-center justify-center">
          <Placeholder width={200} height={150} />
        </div>
        <button className="absolute top-2 right-2 bg-white p-1 rounded-full">
          <Heart className="h-5 w-5 text-gray-medium" />
        </button>
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded-md text-xs font-medium">Zakat</div>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-dark">Wüstenkind e.V.</h3>
        <p className="text-xs text-gray-medium">Helfen spüren</p>
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">Waisen</span>
          <span className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">Bangladesch</span>
          <span className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">Afghanistan</span>
          <button className="text-xs bg-gray-light bg-opacity-30 px-2 py-0.5 rounded-full">+</button>
        </div>
        <div className="flex justify-between mt-4">
          <button className="p-1">
            <Globe className="h-5 w-5 text-gray-medium" />
          </button>
          <button className="p-1">
            <Phone className="h-5 w-5 text-gray-medium" />
          </button>
          <button className="p-1">
            <TikTok className="h-5 w-5 text-gray-medium" />
          </button>
          <button className="p-1">
            <Instagram className="h-5 w-5 text-gray-medium" />
          </button>
        </div>
      </div>
    </div>
  );
} 