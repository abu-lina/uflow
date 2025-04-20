import { Globe, Phone, TwitterIcon as TikTok, Instagram, Heart } from "lucide-react";
import Placeholder from "./Placeholder";

interface SoukCardProps {
  title?: string;
  subtitle?: string;
  location?: string;
  tags?: string[];
  imageUrl?: string;
}

export default function SoukCard({ 
  title = "Bilal Moschee",
  subtitle = "Afghanischer Kulturverein e.V.",
  location = "Stuttgart-West",
  tags = ["Quran", "Juma"],
  imageUrl
}: SoukCardProps) {
  return (
    <div className="flex flex-col w-[296px] h-[397.75px]">
      {/* Visual Section */}
      <div className="flex flex-col justify-between items-center gap-[9.25px] w-[296px] h-[254.38px] relative">
        {/* Image */}
        <div className="absolute w-full h-full left-0 top-0 border-[0.835915px] border-white rounded-[22.2px_22.2px_0_0] overflow-hidden z-0">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Placeholder width={296} height={254} />
          )}
        </div>

        {/* Like Frame */}
        <div className="flex flex-col justify-between items-end p-[14.8px_11.1px] gap-[9.25px] w-full h-[49.95px] z-1">
          <button className="w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center">
            <Heart className="w-[22px] h-[22px] text-white" />
          </button>
        </div>

        {/* Category Frame */}
        <div className="flex flex-col justify-end items-start p-[11.1px] gap-[9.25px] w-full h-[46.2px] z-2">
          <div className="flex justify-center items-center px-2 py-1 bg-[rgba(238,238,238,0.7)] backdrop-blur-[1.67px] rounded-[7.4px]">
            <span className="font-['Inter_Tight'] font-medium text-[14px] leading-[16px] text-[#232323]">
              Moschee
            </span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex flex-col items-center p-[14.8px] w-full h-[143.38px] bg-white border-[0.835915px] border-[#D4D4D4] rounded-[0_0_22.2px_22.2px]">
        <div className="flex flex-col justify-between items-start gap-[14.8px] w-[266.4px] h-[110.07px]">
          {/* Title and Description */}
          <div className="flex flex-col items-start gap-[14.8px] w-full">
            <div className="flex flex-col items-start gap-[2.78px] w-full">
              <h3 className="font-['Inter_Tight'] font-semibold text-[20px] leading-[24px] text-[#232323] w-full">
                {title}
              </h3>
              <p className="font-inter font-normal text-[14px] leading-[17px] text-[#7A7A7A] w-full">
                {subtitle}
              </p>
            </div>
            
            {/* Tags */}
            <div className="flex flex-row items-start gap-[7.4px]">
              <div className="flex justify-center items-center px-1 py-[2px] border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                <span className="font-['Inter_Tight'] font-medium text-[12px] leading-[16px] text-[#232323]">
                  {location}
                </span>
              </div>
              {tags.map((tag, index) => (
                <div key={tag} className="flex justify-center items-center px-1 py-[2px] border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                  <span className="font-['Inter_Tight'] font-medium text-[12px] leading-[16px] text-[#232323]">
                    {tag}
                  </span>
                </div>
              ))}
              <button className="flex justify-center items-center w-5 h-5 border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                <span className="font-['Inter_Tight'] font-medium text-[14px] leading-[16px] text-[#232323]">
                  +
                </span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row items-center gap-[22.2px] w-full">
            <button className="w-[22.2px] h-[22.2px] text-black hover:text-primary transition-colors">
              <Globe className="w-full h-full" />
            </button>
            <button className="w-[22.2px] h-[22.2px] text-black hover:text-primary transition-colors">
              <Phone className="w-full h-full" />
            </button>
            <button className="w-[22.2px] h-[22.2px] text-black hover:text-primary transition-colors">
              <TikTok className="w-full h-full" />
            </button>
            <button className="w-[22.2px] h-[22.2px] text-black hover:text-primary transition-colors">
              <Instagram className="w-full h-full" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 