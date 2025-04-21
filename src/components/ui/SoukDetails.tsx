import React, { useState } from 'react';
import Ornament from './Ornament';
import { X, BookOpen, Home, Star, Heart, Globe } from 'lucide-react';
import ActionBar from './ActionBar';
import { SearchResult } from '../../types/souk';

interface SoukDetailsProps {
  souk: SearchResult | null;
  onClose: () => void;
  onBookmark?: (isBookmarked: boolean) => void;
  isBookmarked?: boolean;
}

const generateSummary = (title: string, subtitle: string, address: string, openingHours: string) => {
  const location = address ? `in ${address}` : 'in der Umgebung';
  const hours = openingHours ? ` und ist ${openingHours} geöffnet` : '';
  
  return `${title} ist ${subtitle} ${location}.${hours} Besuchen Sie uns und erleben Sie die einzigartige Atmosphäre dieses besonderen Ortes.`;
};

const SoukDetails: React.FC<SoukDetailsProps> = ({
  souk,
  onClose,
  onBookmark,
  isBookmarked: initialBookmarked = false,
}) => {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [categoryName, setCategoryName] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!souk) {
    return null;
  }

  const summary = generateSummary(
    souk.souk_name || '',
    souk.description || '',
    souk.address_city || '',
    souk.opening_hours || ''
  );

  // Parse the souk_images JSON and get the urls array
  const images: string[] = souk.souk_images 
    ? JSON.parse(souk.souk_images).urls 
    : [];

  const handleThumbnailClick = (index: number): void => {
    setCurrentImageIndex(index);
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(!isBookmarked);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: souk.souk_name,
        text: souk.description || '',
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      // You might want to show a toast notification here
    }
  };

  const handlePhone = () => {
    if (souk.phone_number) {
      window.location.href = `tel:${souk.phone_number}`;
    }
  };

  const handleWebsite = () => {
    if (souk.website_url) {
      window.open(souk.website_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Main content */}
      <div className="relative w-[1200px] h-[900px] bg-white rounded-[48px] overflow-hidden">
        {/* Left section */}
        <div className="absolute left-0 top-0 w-[704px] h-full p-[40px_16px_40px_48px] flex flex-col gap-8">
          {/* Title section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-8">
              <h1 className="font-['Inter_Tight'] text-[32px] font-semi-bold leading-[39px] text-[#232323]">
                {souk.souk_name}
              </h1>
            </div>
            <p className="font-['Inter'] text-[16px] font-normal leading-[19px] text-[#7A7A7A]">
              {souk.description}
            </p>
          </div>

          {/* Visuals section */}
          <div className="flex flex-col gap-4">
            <div className="w-full h-[480px] rounded-[32px] overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={`${souk.souk_name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-[#589D96]" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-4">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`w-[80px] h-[60px] rounded-[12px] overflow-hidden ${
                      currentImageIndex === index ? 'ring-2 ring-[#589D96]' : ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${souk.souk_name} - Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right section */}
        <div className="absolute right-0 top-0 w-[496px] h-full p-[120px_48px_40px_16px] flex flex-col gap-8">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-[24px] top-[24px] w-[32px] h-[32px] flex items-center justify-center hover:bg-[#EEEEEE] rounded-full transition-colors"
          >
            <X className="w-[32px] h-[32px] text-[#232323]" />
          </button>

          {/* Barakah section */}
          <div className="w-[432px] h-[243.92px] p-4 border border-[#EEEEEE] rounded-[16px] flex flex-col gap-[10px]">
            <div className="flex flex-col gap-4 w-full">
              <h2 className="font-['Inter_Tight'] text-[24px] font-semi-bold leading-[29px] text-[#232323]">
                Unser Barakah Effekt:
              </h2>
              <div className="flex justify-between w-full">
                {/* Left side */}
                <div className="flex flex-col gap-[4.92px] w-[160px]">
                  <div className="w-[160px] h-[120px] rounded-[18px] relative">
                    <div className="absolute w-[211.45px] h-[181.72px] left-0 top-[-0.18px] border border-white rounded-none" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-['Inter_Tight'] text-[17.219px] font-semi-bold leading-[21px] text-[#232323]">
                      Wüstenkind e.V.
                    </span>
                    <span className="font-['Inter_Tight'] text-[17.219px] font-normal leading-[21px] text-[#272727]">
                      Hatem Ipsum
                    </span>
                  </div>
                </div>

                {/* Vertical line */}
                <div className="w-[1px] h-[166.92px] border border-[#EEEEEE]" />

                {/* Right side - Icons */}
                <div className="flex flex-wrap justify-end gap-[10px_8px] w-[160px]">
                  {[
                    { icon: Home, label: 'Juma' },
                    { icon: BookOpen, label: 'Quran' },
                    { icon: Star, label: 'Sadaqah' },
                    { icon: Heart, label: 'Zakat' },
                    { icon: Globe, label: 'Umrah' }
                  ].map(({ icon: Icon, label }, index) => (
                    <div key={index} className="flex flex-col items-center gap-[2px] w-[48px]">
                      <div className="w-[48px] h-[48px] bg-[#589D96] rounded-[12px] flex items-center justify-center">
                        <Icon className="w-[36px] h-[36px] text-white" />
                      </div>
                      <span className="font-['Inter_Tight'] text-[12px] leading-[12px] text-center text-black">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Description section */}
          <div className="w-[432px] h-[203px] p-4 border border-[#EEEEEE] rounded-[16px] flex flex-col gap-[10px]">
            <div className="flex flex-col gap-4 w-full">
              <h2 className="font-['Inter_Tight'] text-[24px] font-semi-bold leading-[29px] text-[#232323]">
                Beschreibung:
              </h2>
              <p className="font-['Inter_Tight'] text-[16px] font-normal leading-[21px] text-[#272727]">
                {summary}
              </p>
            </div>
          </div>

          {/* Details section */}
          <div className="w-[432px] h-[124px] p-4 border border-[#EEEEEE] rounded-[16px] flex flex-col gap-[10px]">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex justify-between w-full">
                {/* Left side - Address */}
                <div className="flex flex-col gap-2 w-[200px]">
                  <h2 className="font-['Inter_Tight'] text-[24px] font-semi-bold leading-[29px] text-[#232323]">
                    Adresse:
                  </h2>
                  <p className="font-['Inter_Tight'] text-[16px] font-normal leading-[21px] text-[#272727]">
                     {souk.address_street}, <br /> {souk.address_zip} {souk.address_city} 
                  </p>
                </div>

                {/* Vertical line */}
                <div className="w-[1px] h-[92px] border border-[#EEEEEE]" />

                {/* Right side - Opening hours */}
                <div className="flex flex-col gap-4 w-[200px] items-end">
                  <h2 className="font-['Inter_Tight'] text-[24px] font-semi-bold leading-[29px] text-[#232323] tracking-[-0.04em]">
                    Öffnungszeiten:
                  </h2>
                  <div className="flex justify-end gap-2">
                    <span className="font-['Inter_Tight'] text-[16px] font-normal leading-[19px] text-[#272727]">
                      Mo-Fr:
                    </span>
                    <span className="font-['Inter_Tight'] text-[16px] font-normal leading-[19px] text-[#272727] text-right">
                     {souk.opening_hours}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex justify-center w-full">
          <ActionBar
            onLike={handleBookmark}
            onShare={handleShare}
            onPhone={handlePhone}
            onWebsite={handleWebsite}
            isLiked={isBookmarked}
          />
        </div>
      </div>
    </div>
  );
};

export default SoukDetails; 