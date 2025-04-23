import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/core/card";
import { ServiceListItem } from "../types";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  service: ServiceListItem;
  className?: string;
}

export function ServiceCard({ service, className }: ServiceCardProps) {
  const {
    service_id,
    service_name,
    service_description,
    service_logo,
    price,
    location,
    owner,
  } = service;

  const formattedPrice = price ? `${price.toLocaleString('de-DE')}€` : 'Preis auf Anfrage';
  const formattedLocation = location?.country || 'Standort nicht angegeben';

  return (
    <Link 
      href={`/services/${service_id}`}
      className={cn("block", className)}
    >
      <Card className="group p-4 hover:shadow-lg transition-all duration-200">
        <div className="flex items-start gap-4">
          {service_logo && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={service_logo}
                alt={`${service_name} Logo`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
          
          <div className="flex-grow min-w-0">
            <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
              {service_name}
            </h3>
            
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {service_description}
            </p>

            {owner && (
              <div className="mt-2 flex items-center gap-2">
                {owner.avatar_url && (
                  <Image
                    src={owner.avatar_url}
                    alt={owner.full_name}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                )}
                <span className="text-sm text-gray-500 truncate">
                  {owner.full_name}
                </span>
              </div>
            )}

            <div className="mt-3 flex justify-between items-center text-sm">
              <span className="font-medium text-primary">
                {formattedPrice}
              </span>
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