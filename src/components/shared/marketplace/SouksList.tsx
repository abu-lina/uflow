import type { Database } from "@/types/database";
import { SoukCard } from "./SoukCard";
import { cn } from "@/lib/utils";

type Souk = Database['public']['Tables']['souks']['Row'];

interface SouksListProps {
  souks: Souk[];
  isLoading?: boolean;
  className?: string;
}

export function SouksList({ 
  souks, 
  isLoading = false,
  className 
}: SouksListProps) {
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

  if (!souks?.length) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-gray-500">
          Keine Souks gefunden.
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
      {souks.map((souk) => (
        <SoukCard 
          key={souk.souk_id} 
          souk={souk}
        />
      ))}
    </div>
  );
} 