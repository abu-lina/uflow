import Image from 'next/image';

interface MobileProfileProviderCardProps {
  imageUrl: string;
  title: string;
  category: string;
  likes: number;
  savedText?: string;
  onClick?: () => void;
}

export function MobileProfileProviderCard({
  imageUrl,
  title,
  category,
  likes,
  savedText = 'Gespeichert',
  onClick,
}: MobileProfileProviderCardProps) {
  return (
    <div
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-white p-3"
      onClick={onClick}
    >
      {/* Image */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
        <Image
          alt={title}
          className="h-full w-full object-cover"
          height={64}
          src={imageUrl}
          width={64}
        />
      </div>
      
      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Title */}
        <div className="min-w-0 truncate font-inter-tight text-base font-semibold text-[#232323]" title={title}>
          {title}
        </div>
        
        {/* Category */}
        <div className="font-inter text-sm text-[#555]">
          {category}
        </div>
        
        {/* Likes */}
        <div className="font-inter text-sm text-[#555]">
          {likes}x {savedText}
        </div>
      </div>
    </div>
  );
}
