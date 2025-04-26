import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SoukListItem } from "@/features/souks/types";

interface SoukCardProps {
  souk: SoukListItem;
  className?: string;
}

export function SoukCard({ souk, className }: SoukCardProps) {
  const {
    souk_id,
    title,
    description,
    logo_url,
    location,
    owner,
  } = souk;

  const formattedLocation = location?.country || 'Standort nicht angegeben';

  return (
    <Link 
      href={`/souks/${souk_id}`}
      className={cn("block", className)}
    >
      <Card className="group p-4 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start gap-4">
          {logo_url && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={logo_url}
                alt={`${title} Logo`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
          
          <div className="flex-grow min-w-0">
            <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
              {title}
            </h3>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {description}
            </p>

            {owner && (
              <div className="mt-2 flex items-center gap-2">
                {owner.avatar_url && (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={owner.avatar_url}
                      alt={owner.full_name}
                      fill
                      className="object-cover"
                      sizes="24px"
                    />
                  </div>
                )}
                <span className="text-sm text-gray-500 truncate">
                  {owner.full_name}
                </span>
              </div>
            )}

            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="text-gray-500">
                {formattedLocation}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
} 