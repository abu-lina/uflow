import { ServiceListItem } from "../types";
import { ServiceCard } from "./ServiceCard";
import { cn } from "@/lib/utils";

interface ServicesListProps {
  services: ServiceListItem[];
  isLoading?: boolean;
  className?: string;
}

export function ServicesList({ 
  services, 
  isLoading = false,
  className 
}: ServicesListProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div 
            key={index}
            className="h-48 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!services?.length) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-gray-500">
          Keine Dienstleistungen gefunden.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Bitte versuchen Sie es mit anderen Suchkriterien.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
      className
    )}>
      {services.map((service) => (
        <ServiceCard 
          key={service.service_id} 
          service={service}
        />
      ))}
    </div>
  );
} 